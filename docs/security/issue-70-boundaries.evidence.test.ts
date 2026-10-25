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
vi.mock("@/lib/studentRepository", () => ({ listStudentsWithOwners: mocks.listStudents, findStudentWithOwner: mocks.getStudent }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    static APIConnectionTimeoutError = class extends Error {};

    messages = { create: mocks.messages };
  },
}));
vi.mock("@/lib/scanPlaces", () => ({
  takeScanPlace: async (subject: string, kind: string, startedAt: Date) => ({ subject, kind, startedAt }),
  freeScanPlace: async () => {},
}));
import { POST as extract } from "@/app/api/analytics/extract/route";
import { GET as roster } from "@/app/api/students/route";
import { GET as student } from "@/app/api/students/[id]/route";
import { extractAnalyticsRowsFromImage } from "@/lib/claudeExtract";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { png, screenshotRequest } from "@/lib/screenshotFixtures/files";

const EXTRACT_URL = "http://localhost/api/analytics/extract";

function imageRequest(bytes: number, type = "image/png") {
  const image = png(1, 1);
  const content = new Uint8Array(Math.max(bytes, image.length));
  content.set(image);
  return screenshotRequest(EXTRACT_URL, { image: new File([content], "synthetic.png", { type }), section: "LR" });
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
    mocks.messages.mockResolvedValue({ content: [{ type: "tool_use", name: "record_analytics_rows", input: { rows: [] } }], usage: { input_tokens: 1, output_tokens: 1 } });
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

  it("fixed in issue 225: roster reads, individual reads, and the admin action guard all use the session role", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "synthetic-admin", role: "admin" } });
    expect((await roster()).status).toBe(200);
    expect((await student(new Request("http://localhost/api/students/synthetic-student"), { params: Promise.resolve({ id: "synthetic-student" }) })).status).toBe(200);
    expect(await requireCurrentAdmin()).toBe("synthetic-admin");
    mocks.auth.mockResolvedValue({ user: { id: "synthetic-student", role: "student" } });
    await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
    expect(mocks.findAccountById).not.toHaveBeenCalled();
  });

  it("fixed in issue 248: the extraction handler checks the session itself", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await extract(await imageRequest(8))).status).toBe(401);
    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("refuses a 6 MiB PNG before calling Anthropic", async () => {
    expect((await extract(await imageRequest(6 * 1024 * 1024))).status).toBe(413);
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("refuses a claimed PNG whose first bytes are not an image before calling Anthropic", async () => {
    const request = await screenshotRequest(EXTRACT_URL, { image: new File([new Uint8Array(8)], "synthetic.png", { type: "image/png" }), section: "LR" });
    expect((await extract(request)).status).toBe(415);
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("ignores the claimed MIME type and sends PNG bytes as image/png", async () => {
    expect((await extract(await imageRequest(8, "text/plain"))).status).toBe(200);
    expect(mocks.messages.mock.calls[0][0].messages[0].content[0].source.media_type).toBe("image/png");
  });

  it("returns a generic extraction error rather than the SDK error message", async () => {
    mocks.messages.mockRejectedValue(new Error("synthetic provider detail"));
    const response = await extract(await imageRequest(8));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  });

  it("fixed in issue 248: malformed multipart gets a plain refusal", async () => {
    const request = new NextRequest(EXTRACT_URL, { method: "POST", body: "invalid", headers: { "content-length": "7" } });
    expect((await extract(request)).status).toBe(400);
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it("fixed in issue 248: refuses model tool output outside the tool's format", async () => {
    mocks.messages.mockResolvedValue({ content: [{
      type: "tool_use", name: "record_analytics_rows", input: { rows: [{ type: "Unknown synthetic type", accuracy: 999, priority: "SOMETIMES" }] },
    }], usage: { input_tokens: 1, output_tokens: 1 } });
    await expect(extractAnalyticsRowsFromImage(Buffer.from([0]), "image/png", mockRules, "LR", () => {})).rejects.toThrow("does not fit its format");
  });

  it("strips profile ownership and operator fields but accepts a non-date goalTestDate", () => {
    const result = studentProfileSchema.parse({ ...mockStudent, goalTestDate: "not-a-date", userId: "synthetic-other-user", role: "admin", $set: { role: "admin" } });
    expect(result.goalTestDate).toBe("not-a-date");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("$set");
  });
});
