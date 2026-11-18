import { describe, expect, it } from "vitest";
import {
  resolveStudentClock,
  resolveStudentTime,
  moveSimulatedDate,
  type AdminClockRepository,
} from "./adminTestWorkspace";
import {
  resetTestWorkspace,
  type AdminTestRepositories,
} from "./adminTestWorkspace";
import {
  loadOrGenerateCurrentWeek,
  type CurrentWeekRepositories,
} from "./currentWeeklySchedule";
import { mockStudent, mockRules, mockAnalytics } from "./mockData";
import type {
  ActivityCheckIn,
  ApprovedAnalyticsSnapshot,
  PersistedWeeklySchedule,
} from "./types";

function clock(role = "admin", simulatedDate: string | null = null) {
  const user = { role, simulatedDate };
  const repository: AdminClockRepository = {
    async findUser() {
      return user;
    },
    async moveDate(_id, expected, next) {
      if (user.simulatedDate !== expected) return false;
      user.simulatedDate = next;
      return true;
    },
  };
  return { user, repository };
}

describe("admin student-side clock", () => {
  it("marks a real student's clock as unsimulated and reuses real time", async () => {
    const real = new Date("2026-09-23T18:24:32.123Z");
    const result = await resolveStudentClock(
      { id: "student", role: "student" },
      real,
      {
        async findUser() { throw new Error("Must not read"); },
        async moveDate() { throw new Error("Must not write"); },
      },
    );
    expect(result).toEqual({ now: real, real, simulated: false });
    expect(result.now).toBe(real);
  });
  it("marks an admin without a simulated date as unsimulated", async () => {
    const { repository } = clock();
    const real = new Date("2026-09-23T18:24:32.123Z");
    expect(await resolveStudentClock({ id: "admin", role: "admin" }, real, repository))
      .toEqual({ now: real, real, simulated: false });
  });
  it("marks an admin with a simulated date and preserves the real wall-clock time", async () => {
    const { repository } = clock("admin", "2026-12-09");
    const real = new Date("2026-09-23T18:24:32.123Z");
    const result = await resolveStudentClock({ id: "admin", role: "admin" }, real, repository);
    expect(result).toEqual({
      now: new Date("2026-12-09T19:24:32.123Z"),
      real,
      simulated: true,
    });
  });
  it("ignores a stray simulated date on a student database record", async () => {
    const { repository } = clock("student", "2026-12-09");
    const real = new Date("2026-09-23T18:24:32.123Z");
    expect(await resolveStudentClock({ id: "admin", role: "admin" }, real, repository))
      .toEqual({ now: real, real, simulated: false });
  });
  it("marks an admin simulated on today's real date as simulated", async () => {
    const { repository } = clock("admin", "2026-09-23");
    const real = new Date("2026-09-23T18:24:32.123Z");
    const result = await resolveStudentClock({ id: "admin", role: "admin" }, real, repository);
    expect(result.now.getTime()).toBe(real.getTime());
    expect(result.simulated).toBe(true);
  });
  it("keeps the real local time of day across daylight saving offsets", async () => {
    const { repository } = clock("admin", "2026-12-09");
    const now = await resolveStudentTime(
      { id: "admin", role: "admin" },
      new Date("2026-09-23T18:24:32.123Z"),
      repository,
    );
    expect(now.toISOString()).toBe("2026-12-09T19:24:32.123Z");
  });
  it("uses real time for a student without reading their stored simulated date", async () => {
    const real = new Date("2026-09-23T18:00:00Z");
    expect(
      await resolveStudentTime({ id: "student", role: "student" }, real, {
        async findUser() {
          throw new Error("Must not read");
        },
        async moveDate() {
          throw new Error("Must not write");
        },
      }),
    ).toBe(real);
  });
  it("ignores simulated dates when the current database role is student", async () => {
    const { repository } = clock("student", "2026-12-09");
    const real = new Date("2026-09-23T18:00:00Z");
    expect(
      await resolveStudentTime(
        { id: "admin", role: "admin" },
        real,
        repository,
      ),
    ).toBe(real);
  });
  it("only moves to a valid later calendar date", async () => {
    const { user, repository } = clock("admin", "2026-09-23");
    const real = new Date("2026-09-21T18:00:00Z");
    for (const date of ["2026-09-22", "2026-09-23", "2027-02-30", "invalid"]) {
      await expect(
        moveSimulatedDate("admin", date, real, repository),
      ).rejects.toThrow();
    }
    await moveSimulatedDate("admin", "2026-09-28", real, repository);
    expect(user.simulatedDate).toBe("2026-09-28");
  });
  it("moves at most 56 days past the student side's date", async () => {
    const { user, repository } = clock("admin", "2026-09-23");
    const real = new Date("2026-09-21T18:00:00Z");
    await expect(moveSimulatedDate("admin", "2026-11-19", real, repository)).rejects.toThrow("Choose a date within 56 days.");
    expect(user.simulatedDate).toBe("2026-09-23");
    await moveSimulatedDate("admin", "2026-11-18", real, repository);
    expect(user.simulatedDate).toBe("2026-11-18");
  });
});

function workspace() {
  const { user, repository } = clock("admin", "2026-10-07");
  const records = {
    students: ["admin-student", "real-student"],
    schedules: [
      { id: "old", studentId: "admin-student", week: "2026-09-28" },
      { id: "current", studentId: "admin-student", week: "2026-10-05" },
      { id: "real", studentId: "real-student", week: "2026-10-05" },
    ],
    checkIns: ["old", "current", "real"],
    snapshots: ["admin-student", "real-student"],
    practiceTests: ["admin-student", "real-student"],
  };
  const repos: AdminTestRepositories = {
    clock: repository,
    async findStudent() {
      return records.students.includes("admin-student")
        ? { id: "admin-student" }
        : null;
    },
    async inTransaction(work) {
      await work({
        async deleteSchedules(studentId) {
          const ids = records.schedules.filter((s) => s.studentId === studentId).map((s) => s.id);
          records.checkIns = records.checkIns.filter((id) => !ids.includes(id));
          records.schedules = records.schedules.filter((s) => !ids.includes(s.id));
        },
        async deleteSnapshots(studentId) {
          records.snapshots = records.snapshots.filter((id) => id !== studentId);
        },
        async deletePracticeTestResults(studentId) {
          records.practiceTests = records.practiceTests.filter((id) => id !== studentId);
        },
        async deleteStudent(studentId, userId) {
          if (userId !== "admin") return;
          records.students = records.students.filter((id) => id !== studentId);
        },
        async clearSimulatedDate(userId) {
          if (userId === "admin") user.simulatedDate = null;
        },
      });
    },
  };
  return { repos, records, user };
}

it("rejects a non-admin before reading their Student for reset", async () => {
  const { repos } = workspace();
  repos.clock = clock("student", "2026-10-07").repository;
  repos.findStudent = async () => { throw new Error("Student was read"); };
  await expect(resetTestWorkspace("admin", repos))
    .rejects.toThrow("Admin access required.");
});

it("resets everything on the admin's student side, preserving real students", async () => {
  const { repos, records, user } = workspace();
  await resetTestWorkspace("admin", repos);
  expect(records.schedules.map((s) => s.id)).toEqual(["real"]);
  expect(records.checkIns).toEqual(["real"]);
  expect(records.snapshots).toEqual(["real-student"]);
  expect(records.practiceTests).toEqual(["real-student"]);
  expect(records.students).toEqual(["real-student"]);
  expect(user.simulatedDate).toBeNull();
  user.simulatedDate = "2026-10-07";
  await expect(resetTestWorkspace("admin", repos)).resolves.toBeUndefined();
  expect(records.students).toEqual(["real-student"]);
  expect(user.simulatedDate).toBeNull();
});

it("carries performance trend and Sunday practice-test review across three simulated weeks", async () => {
  const { repository } = clock();
  const real = new Date("2026-09-21T18:00:00Z");
  const snapshots: ApprovedAnalyticsSnapshot[] = [];
  const schedules: PersistedWeeklySchedule[] = [];
  const checkIns: ActivityCheckIn[] = [];
  const repos: CurrentWeekRepositories = {
    snapshots: {
      async listEligibleForStudent() {
        return snapshots;
      },
    },
    practiceTestResults: {
      async listForStudent() {
        return [];
      },
    },
    weeklySchedules: {
      async findByStudentAndWeek(id, week) {
        return (
          schedules.find(
            (s) => s.studentId === id && s.weekStartDate === week,
          ) ?? null
        );
      },
      async listBeforeWeek(id, week) {
        return schedules.filter(
          (s) => s.studentId === id && s.weekStartDate < week,
        );
      },
      async create(schedule) {
        schedules.push(schedule);
        return schedule;
      },
    },
    activityCheckIns: {
      async ensureForSchedule(schedule) {
        Object.entries(schedule.schedule.days).forEach(([day, plan]) =>
          plan.activities.forEach((_, index) => {
            const activityId = `${day}:${index}`;
            if (
              !checkIns.some(
                (c) =>
                  c.scheduleId === schedule.id && c.activityId === activityId,
              )
            ) {
              checkIns.push({
                id: `${schedule.id}:${activityId}`,
                scheduleId: schedule.id,
                activityId,
                status: "not_started",
              });
            }
          }),
        );
      },
    },
  };
  const now = () =>
    resolveStudentTime({ id: "admin", role: "admin" }, real, repository);
  const load = async () => {
    const time = await now();
    return loadOrGenerateCurrentWeek({
      ...repos,
      plan: { kind: "admin" },
      studentId: "admin-student",
      student: {
        ...mockStudent,
        dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, TUESDAY: 90 },
        preferredPracticeTestDay: "SUNDAY",
        goalTestDate: "2027-06-01",
      },
      studentName: "Admin",
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => time,
    });
  };
  const approve = async (id: string, accuracy: number) =>
    snapshots.push({
      ...mockAnalytics,
      id,
      approvedAt: (await now()).toISOString(),
      lrAccuracyByType: { "Main conclusion or main point": accuracy },
    });
  await moveSimulatedDate("admin", "2026-09-23", real, repository);
  await approve("first", 0.6);
  const first = await load();
  if (first.kind !== "schedule") throw new Error("Expected a weekly schedule");
  expect(first.schedule.weekStartDate).toBe("2026-09-21");
  expect(first.schedule.schedule.days.MONDAY.type).toBe("unscheduled");
  expect(first.schedule.schedule.days.TUESDAY.type).toBe("unscheduled");
  await moveSimulatedDate("admin", "2026-09-28", real, repository);
  expect(await load()).toEqual({ kind: "analytics_required" });
  await approve("second", 0.8);
  const second = await load();
  if (second.kind !== "schedule") throw new Error("Expected a weekly schedule");
  expect(second.schedule.generationInputs).not.toHaveProperty("priorWeekProgress");
  expect(second.schedule.schedule.days.MONDAY.type).toBe("review");
  expect(
    second.schedule.generationInputs.analytics.lrAccuracyByType[
      "Main conclusion or main point"
    ],
  ).toBeCloseTo(0.733333);
  await moveSimulatedDate("admin", "2026-10-05", real, repository);
  await approve("third", 0.7);
  const third = await load();
  if (third.kind !== "schedule") throw new Error("Expected a weekly schedule");
  expect(third.schedule.sourceSnapshotIds).toEqual([
    "third",
    "second",
    "first",
  ]);
  expect(
    third.schedule.generationInputs.analytics.lrAccuracyByType[
      "Main conclusion or main point"
    ],
  ).toBeCloseTo(0.72);
  expect(third.schedule.generationInputs.priorScheduleIds).toHaveLength(2);
});
