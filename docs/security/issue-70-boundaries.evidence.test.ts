import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockStudent, mockRules } from "@/lib/mockData";
import { studentProfileSchema } from "@/lib/studentProfile";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), connectDB: vi.fn(), findAccountById: vi.fn(), findStudent: vi.fn(),
  listStudents: vi.fn(), getStudent: vi.fn(),
  messages: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/accountRepository", () => ({ findAccountById: mocks.findAccountById }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/students", () => ({ listStudentsWithOwners: mocks.listStudents, getStudentWithOwner: mocks.getStudent }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create: mocks.messages }; },
}));
import { POST as extract } from "@/app/api/analytics/extract/route";
import { GET as roster } from "@/app/api/students/route";
import { GET as student } from "@/app/api/students/[id]/route";
import { extractAnalyticsRowsFromImage } from "@/lib/claudeExtract";
import { requireCurrentAdmin } from "@/lib/requireAdmin";

function imageRequest(bytes: number, type = "image/png") {
  const form = new FormData();
  form.set("image", new File([new Uint8Array(bytes)], "synthetic.png", { type }));
  return new NextRequest("http://localhost/api/analytics/extract", { method: "POST", body: form });
}

describe("issue 70 request boundary evidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T15:00:00.000Z"));
    mocks.auth.mockResolvedValue({ user: { id: "synthetic-user", role: "student" } });
    mocks.findStudent.mockReturnValue({
      _id: "synthetic-student", lean: async () => ({ _id: "synthetic-student" }),
    });
    mocks.messages.mockResolvedValue({ content: [{ type: "tool_use", input: { rows: [] } }] });
    mocks.listStudents.mockResolvedValue([{ email: "student@example.invalid" }]);
    mocks.getStudent.mockResolvedValue({ email: "student@example.invalid" });
    mocks.findAccountById.mockResolvedValue({ role: "student" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each([null, { user: { id: "synthetic-user", role: "student" } }])("denies a roster read without an admin session", async (session) => {
    mocks.auth.mockResolvedValue(session);
    expect((await roster()).status).toBe(403);
    expect(mocks.listStudents).not.toHaveBeenCalled();
    expect(mocks.connectDB).not.toHaveBeenCalled();
  });

  it("allows roster and individual reads with a stale admin claim, while the admin action guard rejects it", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "synthetic-demoted-admin", role: "admin" } });
    expect((await roster()).status).toBe(200);
    expect((await student(new Request("http://localhost/api/students/synthetic-student"), { params: Promise.resolve({ id: "synthetic-student" }) })).status).toBe(200);
    expect(mocks.findAccountById).not.toHaveBeenCalled();
    await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
    expect(mocks.findAccountById).toHaveBeenCalledWith("synthetic-demoted-admin");
  });

  it("the extraction handler itself calls Anthropic without authentication", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await extract(imageRequest(8))).status).toBe(200);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.messages).toHaveBeenCalledOnce();
  });

  it("passes a 6 MiB file of invalid PNG bytes to Anthropic without size or signature checks", async () => {
    expect((await extract(imageRequest(6 * 1024 * 1024))).status).toBe(200);
    expect(mocks.messages).toHaveBeenCalledOnce();
    const image = mocks.messages.mock.calls[0][0].messages[0].content[0];
    expect(image.source.media_type).toBe("image/png");
    expect(image.source.data.length).toBe(8 * 1024 * 1024);
  });

  it("rejects an unsupported claimed MIME type before calling Anthropic", async () => {
    expect((await extract(imageRequest(8, "text/plain"))).status).toBe(502);
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("returns a generic extraction error rather than the SDK error message", async () => {
    mocks.messages.mockRejectedValue(new Error("synthetic provider detail"));
    const response = await extract(imageRequest(8));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  });

  it("lets malformed multipart parsing escape its generic error handler", async () => {
    const request = new NextRequest("http://localhost/api/analytics/extract", { method: "POST", body: "invalid" });
    await expect(extract(request)).rejects.toThrow();
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("trusts out-of-schema model tool output at runtime", async () => {
    mocks.messages.mockResolvedValue({ content: [{ type: "tool_use", input: { rows: [{ type: "Unknown synthetic type", accuracy: 999, isTopPriority: "yes" }] } }] });
    expect(await extractAnalyticsRowsFromImage(Buffer.from([0]), "image/png", mockRules)).toEqual([
      { type: "Unknown synthetic type", category: "regular", accuracy: 999, isTopPriority: "yes" },
    ]);
  });

  it("strips profile ownership and operator fields but accepts a non-date goalTestDate", () => {
    const result = studentProfileSchema.parse({ ...mockStudent, goalTestDate: "not-a-date", userId: "synthetic-other-user", role: "admin", $set: { role: "admin" } });
    expect(result.goalTestDate).toBe("not-a-date");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("$set");
  });
});
