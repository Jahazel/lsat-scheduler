import { describe, expect, it } from "vitest";
import { SNAPSHOT_INDEX, SNAPSHOT_INDEX_NAME } from "../../scripts/migrate-analytics-snapshots.mjs";
import { AnalyticsSnapshotModel } from "./AnalyticsSnapshot";

describe("AnalyticsSnapshotModel indexes", () => {
  it("keeps the approved-snapshot query index aligned with the migration", () => {
    expect(AnalyticsSnapshotModel.schema.indexes()).toContainEqual([
      SNAPSHOT_INDEX,
      { name: SNAPSHOT_INDEX_NAME },
    ]);
  });
});
