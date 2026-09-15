import { describe, expect, it } from "vitest";
import { deleteStudentAccount } from "./deleteStudentAccount";

describe("deleteStudentAccount", () => {
  it("removes only the requested student's approved and legacy analytics, schedules, check-ins, student, and user", async () => {
    const analytics = [
      { studentId: "student-1", status: "approved" },
      { studentId: "student-1", status: "legacy" },
      { studentId: "student-2", status: "legacy" },
    ];
    const schedules = [{ id: "schedule-1", studentId: "student-1" }, { id: "schedule-2", studentId: "student-2" }];
    const checkIns = [{ scheduleId: "schedule-1" }, { scheduleId: "schedule-2" }];
    const students = ["student-1", "student-2"];
    const users = ["user-1", "user-2"];

    await deleteStudentAccount({ studentId: "student-1", userId: "user-1" }, {
      deleteAnalytics: async (studentId) => {
        for (let index = analytics.length - 1; index >= 0; index--) if (analytics[index].studentId === studentId) analytics.splice(index, 1);
      },
      listScheduleIds: async (studentId) => schedules.filter((schedule) => schedule.studentId === studentId).map((schedule) => schedule.id),
      deleteCheckIns: async (scheduleIds) => {
        for (let index = checkIns.length - 1; index >= 0; index--) if (scheduleIds.includes(checkIns[index].scheduleId)) checkIns.splice(index, 1);
      },
      deleteSchedules: async (studentId) => {
        for (let index = schedules.length - 1; index >= 0; index--) if (schedules[index].studentId === studentId) schedules.splice(index, 1);
      },
      deleteStudent: async (studentId) => { students.splice(students.indexOf(studentId), 1); },
      deleteUser: async (userId) => { users.splice(users.indexOf(userId), 1); },
    });

    expect(analytics).toEqual([{ studentId: "student-2", status: "legacy" }]);
    expect(schedules).toEqual([{ id: "schedule-2", studentId: "student-2" }]);
    expect(checkIns).toEqual([{ scheduleId: "schedule-2" }]);
    expect(students).toEqual(["student-2"]);
    expect(users).toEqual(["user-2"]);
  });
});
