import { date, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DayOfWeek, Student } from "./types";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
  simulatedDate: date("simulated_date", { mode: "string" }),
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
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
