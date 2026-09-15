import { describe, expect, it } from "vitest";
import { ACTIVITY_CHECK_IN_INDEX, ACTIVITY_CHECK_IN_INDEX_NAME } from "../../scripts/activityCheckInIndex.mjs";
import { ActivityCheckInModel } from "./ActivityCheckIn";

describe("ActivityCheckInModel", () => {
  it("enforces one editable check-in for each saved schedule activity", () => {
    expect(ActivityCheckInModel.schema.indexes()).toContainEqual([
      ACTIVITY_CHECK_IN_INDEX,
      { unique: true, name: ACTIVITY_CHECK_IN_INDEX_NAME },
    ]);
  });

  it("clears actual minutes when a completed activity is corrected to skipped", async () => {
    const checkIn = new ActivityCheckInModel({
      scheduleId: "507f1f77bcf86cd799439011",
      activityId: "MONDAY:0",
      status: "skipped",
      actualMinutes: 45,
    });

    await checkIn.validate();

    expect(checkIn.actualMinutes).toBeUndefined();
  });
});
