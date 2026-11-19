import { asc, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { testMonths } from "./postgresSchema";
import { testMonthOptions } from "./testMonths";

export async function listTestMonths(): Promise<string[]> {
  const rows = await getPostgresDatabase().select({ month: testMonths.month }).from(testMonths).orderBy(asc(testMonths.month));
  return rows.map((row) => row.month);
}

export async function upcomingTestMonths(today: string) {
  return testMonthOptions(await listTestMonths(), today);
}

export type ListedTestMonth = { month: string; students: number };

export async function listTestMonthsWithStudents(): Promise<ListedTestMonth[]> {
  const result = await getPostgresDatabase().execute<ListedTestMonth>(sql`
    select test_months.month::text as month, count(students.id)::integer as students
    from test_months left join students on students.goal_test_date = test_months.month
    group by test_months.month
    order by test_months.month
  `);
  return result.rows;
}

export async function addTestMonth(month: string): Promise<"added" | "already listed"> {
  const added = await getPostgresDatabase().insert(testMonths).values({ month }).onConflictDoNothing().returning();
  return added.length > 0 ? "added" : "already listed";
}

export async function removeTestMonth(month: string): Promise<{ removed: boolean; students: number }> {
  const result = await getPostgresDatabase().execute<{ removed: boolean; students: number }>(sql`
    with picked as (select count(*)::integer as students from students where goal_test_date = ${month}),
    removed as (delete from test_months where month = ${month} and (select students from picked) = 0 returning month)
    select exists (select from removed) as removed, (select students from picked) as students
  `);
  return result.rows[0]!;
}
