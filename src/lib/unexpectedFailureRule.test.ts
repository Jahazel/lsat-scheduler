import { ESLint } from "eslint";
import { expect, it } from "vitest";

const eslint = new ESLint();
const rule29Messages = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath })).flatMap((result) => result.messages)
    .filter((message) => message.message.includes("rule 29"))
    .map((message) => message.line);

it("refuses a Server Action or Route Handler that does not answer through the shared function", async () => {
  expect(await rule29Messages(`"use server";
import { answerAction } from "@/lib/securityLog";
export type Reply = { saved: boolean };
export async function save() {
  return answerAction("/dashboard", async () => ({ saved: true }));
}
export async function skip() {
  return { saved: true };
}
export const alias = save;
`, "src/app/dashboard/actions.ts")).toEqual([7, 10]);

  expect(await rule29Messages(`import { answerRequest } from "@/lib/securityLog";
export async function GET() {
  return answerRequest("/api/students", async () => Response.json([]));
}
export async function POST(request: Request) {
  const body = await request.json();
  return answerRequest("/api/students", async () => Response.json(body));
}
`, "src/app/api/students/route.ts")).toEqual([5]);
});
