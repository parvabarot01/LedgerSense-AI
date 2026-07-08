import { describe, expect, it } from "vitest";
import { detectOutliers } from "@/lib/detection/outliers";
import type { DetectionRecord } from "@/lib/detection/types";

const rec = (id: string, amount: number): DetectionRecord => ({ id, date: "2026-01-01", amount });

describe("detectOutliers", () => {
  it("does nothing below the minimum sample size", () => {
    const records = [rec("a1", 10), rec("a2", 12), rec("a3", 1000)];
    expect(detectOutliers(records, "a")).toHaveLength(0);
  });

  it("flags a value far outside the distribution", () => {
    const records = [
      rec("a1", 100),
      rec("a2", 105),
      rec("a3", 98),
      rec("a4", 102),
      rec("a5", 101),
      rec("a6", 99),
      rec("a7", 9000),
    ];

    const exceptions = detectOutliers(records, "a");
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].recordRefs).toEqual([{ side: "a", id: "a7" }]);
    expect(exceptions[0].type).toBe("outlier");
  });

  it("does not flag a tight, uniform distribution", () => {
    const records = [rec("a1", 100), rec("a2", 101), rec("a3", 99), rec("a4", 100), rec("a5", 100)];
    expect(detectOutliers(records, "a")).toHaveLength(0);
  });
});
