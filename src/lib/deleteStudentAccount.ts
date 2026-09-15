export interface StudentAccountDeletionRepositories {
  deleteAnalytics(studentId: string): Promise<void>;
  listScheduleIds(studentId: string): Promise<string[]>;
  deleteCheckIns(scheduleIds: string[]): Promise<void>;
  deleteSchedules(studentId: string): Promise<void>;
  deleteStudent(studentId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export async function deleteStudentAccount(
  { studentId, userId }: { studentId: string; userId: string },
  repositories: StudentAccountDeletionRepositories,
) {
  await repositories.deleteAnalytics(studentId);
  const scheduleIds = await repositories.listScheduleIds(studentId);
  await repositories.deleteCheckIns(scheduleIds);
  await repositories.deleteSchedules(studentId);
  await repositories.deleteStudent(studentId);
  await repositories.deleteUser(userId);
}
