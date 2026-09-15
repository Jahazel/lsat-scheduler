import { describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_CHECK_IN_INDEX,
  ACTIVITY_CHECK_IN_INDEX_NAME,
  migrateActivityCheckIns,
} from "./migrate-activity-check-ins.mjs";

describe("migrateActivityCheckIns", () => {
  it("creates the check-in uniqueness index once and is safe to repeat", async () => {
    const collection = {
      indexes: vi
        .fn()
        .mockResolvedValueOnce([{ name: "_id_", key: { _id: 1 } }])
        .mockResolvedValueOnce([{ name: ACTIVITY_CHECK_IN_INDEX_NAME, key: ACTIVITY_CHECK_IN_INDEX, unique: true }]),
      createIndex: vi.fn().mockResolvedValue(ACTIVITY_CHECK_IN_INDEX_NAME),
    };

    await migrateActivityCheckIns(collection);
    await migrateActivityCheckIns(collection);

    expect(collection.createIndex).toHaveBeenCalledTimes(1);
    expect(collection.createIndex).toHaveBeenCalledWith(ACTIVITY_CHECK_IN_INDEX, {
      unique: true,
      name: ACTIVITY_CHECK_IN_INDEX_NAME,
    });
  });

  it("repairs a named activity check-in index that does not enforce uniqueness", async () => {
    const collection = {
      indexes: vi.fn().mockResolvedValue([
        { name: ACTIVITY_CHECK_IN_INDEX_NAME, key: ACTIVITY_CHECK_IN_INDEX, unique: false },
      ]),
      dropIndex: vi.fn().mockResolvedValue(undefined),
      createIndex: vi.fn().mockResolvedValue(ACTIVITY_CHECK_IN_INDEX_NAME),
    };

    await migrateActivityCheckIns(collection);

    expect(collection.dropIndex).toHaveBeenCalledWith(ACTIVITY_CHECK_IN_INDEX_NAME);
    expect(collection.createIndex).toHaveBeenCalledWith(ACTIVITY_CHECK_IN_INDEX, {
      unique: true,
      name: ACTIVITY_CHECK_IN_INDEX_NAME,
    });
  });
});
