import { z } from "zod";

export type TestMonthOption = { value: string; label: string };

export const FEW_TEST_MONTHS = 4;

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export const testMonthName = (month: string) => monthLabel.format(new Date(`${month}T00:00:00Z`));

export function testMonthOptions(testMonths: readonly string[], today: string): TestMonthOption[] {
  return testMonths.filter((month) => month > today).map((value) => ({ value, label: testMonthName(value) }));
}

const MONTH_PICK = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2999),
});

export function parseTestMonthPick(input: { month: unknown; year: unknown }): string | null {
  const pick = MONTH_PICK.safeParse(input);
  if (!pick.success) return null;
  return `${pick.data.year}-${String(pick.data.month).padStart(2, "0")}-01`;
}

export const isTestMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value);
