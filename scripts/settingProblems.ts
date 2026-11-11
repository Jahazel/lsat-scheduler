import type { z } from "zod";

export type SettingProblem<Setting extends string = string> = { setting: Setting; problem: "missing" | "refused" };

export function settingProblems<Setting extends string>(
  settings: readonly Setting[],
  error: z.ZodError,
  env: Readonly<Record<string, string | undefined>>,
): SettingProblem<Setting>[] {
  return settings
    .filter((setting) => error.issues.some((issue) => issue.path[0] === setting))
    .map((setting) => ({ setting, problem: env[setting] ? "refused" : "missing" }));
}
