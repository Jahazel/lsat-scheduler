export function simulatedScheduleNow(value: unknown) {
  if (process.env.NODE_ENV !== "development" || typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const now = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(now.getTime()) || now.toISOString().slice(0, 10) !== value ? null : now;
}

export function simulatedSnapshotInput(input: unknown, approvedAt: Date | null) {
  if (!approvedAt || typeof input !== "object" || input === null) return input;

  const extractedAt = new Date(approvedAt.getTime() - 5 * 60 * 1000).toISOString();
  const confirmedAt = new Date(approvedAt.getTime() - 60 * 1000).toISOString();
  const values = input as Record<string, unknown>;
  return {
    ...values,
    extraction: { source: "7sage_screenshot", extractedAt },
    confirmation: {
      ...(typeof values.confirmation === "object" && values.confirmation !== null ? values.confirmation : {}),
      extractedValuesMatch: true,
      isLatestAnalytics: true,
      confirmedAt,
    },
  };
}
