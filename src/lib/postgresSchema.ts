import { boolean, jsonb, date, integer, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  Activity, ActivityCheckInStatus, AnalyticsSnapshot, DayOfWeek, DayPlan, LRType, PersistedWeeklySchedule, RCType, Student,
  WeeklySchedule,
} from "./types";
import type { PracticeTestResult } from "./practiceTestResult";
import type { OfficialAttempt } from "./studentProfile";

type SavedOneTypeActivity = { drillMinutes: number; reviewMinutes?: number; isFullSection: boolean } & (
  | { kind: "LR"; type: LRType; questionCount: number; difficultyRange: string }
  | { kind: "RC"; type: RCType; passageCount: number; difficultyLevel: number }
);
export type SavedActivity = Activity | SavedOneTypeActivity;
export type SavedWeeklySchedule = Omit<WeeklySchedule, "days"> & {
  days: Record<DayOfWeek, Omit<DayPlan, "activities"> & { activities: SavedActivity[] }>;
};

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
  simulatedDate: date("simulated_date", { mode: "string" }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  sessionVersion: integer("session_version").notNull().default(0),
});

const dailyCapacity = (name: string) => numeric(name, { mode: "number" }).notNull();

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().unique().references(() => accounts.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["7Sage", "LSAT Demon"] }).notNull(),
  currentScore: integer("current_score").notNull(),
  goalScore: integer("goal_score").notNull(),
  goalTestDate: date("goal_test_date", { mode: "string" }).notNull(),
  preferredPracticeTestDay: text("preferred_practice_test_day").$type<DayOfWeek>().notNull(),
  accommodation: numeric("accommodation", { mode: "number" }).$type<Student["accommodationMultiplier"]>().notNull(),
  mondayCapacityMinutes: dailyCapacity("monday_capacity_minutes"),
  tuesdayCapacityMinutes: dailyCapacity("tuesday_capacity_minutes"),
  wednesdayCapacityMinutes: dailyCapacity("wednesday_capacity_minutes"),
  thursdayCapacityMinutes: dailyCapacity("thursday_capacity_minutes"),
  fridayCapacityMinutes: dailyCapacity("friday_capacity_minutes"),
  saturdayCapacityMinutes: dailyCapacity("saturday_capacity_minutes"),
  sundayCapacityMinutes: dailyCapacity("sunday_capacity_minutes"),
  officialAttempts: jsonb("official_attempts").$type<OfficialAttempt[]>().notNull().default([]),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  weekOf: date("week_of", { mode: "string" }).notNull(),
  lrAccuracyByType: jsonb("lr_accuracy_by_type").$type<AnalyticsSnapshot["lrAccuracyByType"]>().notNull(),
  lrTopPriorityLogicTypes: text("lr_top_priority_logic_types").array().$type<AnalyticsSnapshot["lrTopPriorityLogicTypes"]>().notNull(),
  rcAccuracyByType: jsonb("rc_accuracy_by_type").$type<NonNullable<AnalyticsSnapshot["rcAccuracyByType"]>>(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  extractionSource: text("extraction_source", { enum: ["7sage_screenshot", "admin_sample"] }).notNull(),
  extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull(),
  extractedValuesMatch: boolean("extracted_values_match").notNull(),
  isLatestAnalytics: boolean("is_latest_analytics").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
});

export const practiceTestResults = pgTable("practice_test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  weekOf: date("week_of", { mode: "string" }).notNull(),
  prepTest: integer("prep_test").notNull(),
  sections: jsonb("sections").$type<PracticeTestResult["sections"]>().notNull(),
  hiddenResults: jsonb("hidden_results").$type<PracticeTestResult["hiddenResults"]>().notNull().default([]),
  missedStemTypeCounts: jsonb("missed_stem_type_counts").$type<PracticeTestResult["missedStemTypeCounts"]>().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  extractionSource: text("extraction_source", { enum: ["7sage_screenshot", "admin_sample"] }).notNull(),
  extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull(),
  extractedValuesMatch: boolean("extracted_values_match").notNull(),
  isThisWeeksPracticeTest: boolean("is_this_weeks_practice_test").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
});

export const weeklySchedules = pgTable("weekly_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  weekStartDate: date("week_start_date", { mode: "string" }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  schedule: jsonb("schedule").$type<SavedWeeklySchedule>().notNull(),
  sourceSnapshotIds: uuid("source_snapshot_ids").array().notNull(),
  generationInputs: jsonb("generation_inputs").$type<PersistedWeeklySchedule["generationInputs"]>().notNull(),
  policyVersion: text("policy_version").notNull(),
});

export const activityCheckIns = pgTable("activity_check_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").notNull().references(() => weeklySchedules.id, { onDelete: "cascade" }),
  activityId: text("activity_id").notNull(),
  status: text("status").$type<ActivityCheckInStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const actionCounters = pgTable("action_counters", {
  action: text("action").notNull(),
  subject: text("subject").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
}, (table) => [primaryKey({ columns: [table.action, table.subject, table.windowStart] })]);

export const runningScans = pgTable("running_scans", {
  subject: text("subject").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
});

export const scanSettings = pgTable("scan_settings", {
  onlyRow: boolean("only_row").primaryKey(),
  scanningOff: boolean("scanning_off").notNull(),
  monthlyLimitUsd: numeric("monthly_limit_usd", { mode: "number" }).notNull(),
});

export const scanSpending = pgTable("scan_spending", {
  monthStart: timestamp("month_start", { withTimezone: true }).primaryKey(),
  totalUsd: numeric("total_usd", { mode: "number" }).notNull(),
  warningSentAt: timestamp("warning_sent_at", { withTimezone: true }),
  limitAlertSentAt: timestamp("limit_alert_sent_at", { withTimezone: true }),
});
