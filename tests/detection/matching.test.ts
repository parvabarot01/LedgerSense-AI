import { describe, expect, it } from "vitest";
import { matchRecords } from "@/lib/detection/matching";
import type { DetectionRecord } from "@/lib/detection/types";

const rec = (id: string, date: string, amount: number, extra: Partial<DetectionRecord> = {}): DetectionRecord => ({
  id,
  date,
  amount,
  ...extra,
});

describe("matchRecords", () => {
  it("exact-matches same amount and date", () => {
    const a = [rec("a1", "2026-01-05", 100)];
    const b = [rec("b1", "2026-01-05", 100)];

    const { matches, unmatchedA, unmatchedB } = matchRecords(a, b, { windowDays: 3, amountTolerance: 0 });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ aId: "a1", bId: "b1", matchType: "exact", status: "matched" });
    expect(unmatchedA).toHaveLength(0);
    expect(unmatchedB).toHaveLength(0);
  });

  it("fuzzy-matches within window and tolerance, flagged disputed", () => {
    const a = [rec("a1", "2026-01-05", 100)];
    const b = [rec("b1", "2026-01-07", 101)];

    const { matches } = matchRecords(a, b, { windowDays: 3, amountTolerance: 0.02 });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ matchType: "fuzzy", status: "disputed" });
    expect(matches[0].amountDelta).toBeCloseTo(-1);
    expect(matches[0].dateDeltaDays).toBe(2);
  });

  it("leaves records unmatched outside the window or tolerance", () => {
    const a = [rec("a1", "2026-01-05", 100)];
    const b = [rec("b1", "2026-01-20", 100)];

    const { matches, unmatchedA, unmatchedB } = matchRecords(a, b, { windowDays: 3, amountTolerance: 0 });

    expect(matches).toHaveLength(0);
    expect(unmatchedA).toHaveLength(1);
    expect(unmatchedB).toHaveLength(1);
  });

  it("prefers exact matches over fuzzy when both are candidates", () => {
    const a = [rec("a1", "2026-01-05", 100)];
    const b = [rec("b1", "2026-01-05", 100), rec("b2", "2026-01-06", 100.5)];

    const { matches, unmatchedB } = matchRecords(a, b, { windowDays: 3, amountTolerance: 0.02 });

    expect(matches).toHaveLength(1);
    expect(matches[0].bId).toBe("b1");
    expect(unmatchedB.map((r) => r.id)).toEqual(["b2"]);
  });

  it("never double-assigns a record to two pairs", () => {
    const a = [rec("a1", "2026-01-05", 100), rec("a2", "2026-01-05", 100)];
    const b = [rec("b1", "2026-01-05", 100)];

    const { matches, unmatchedA } = matchRecords(a, b, { windowDays: 3, amountTolerance: 0 });

    expect(matches).toHaveLength(1);
    expect(unmatchedA).toHaveLength(1);
  });
});
