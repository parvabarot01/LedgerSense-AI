import { describe, expect, it } from "vitest";
import { runDetection } from "@/lib/detection/runDetection";
import type { DetectionRecord } from "@/lib/detection/types";

const rec = (id: string, date: string, amount: number, extra: Partial<DetectionRecord> = {}): DetectionRecord => ({
  id,
  date,
  amount,
  ...extra,
});

describe("runDetection", () => {
  it("produces a coherent summary across matched, disputed, and unmatched records", () => {
    const sourceA: DetectionRecord[] = [
      rec("a1", "2026-01-05", 100, { reference: "REF1" }),
      rec("a2", "2026-01-06", 250, { reference: "REF2" }),
      rec("a3", "2026-01-01", 5000), // will be unmatched and an outlier
      rec("a4", "2025-11-01", 40), // old, unmatched -> classified unmatched not timing_gap
    ];
    const sourceB: DetectionRecord[] = [
      rec("b1", "2026-01-05", 100, { reference: "REF1" }), // exact match with a1
      rec("b2", "2026-01-08", 260, { reference: "REF2" }), // fuzzy/disputed match with a2 (amount+date delta)
    ];

    const result = runDetection(sourceA, sourceB, { windowDays: 3, amountTolerance: 0.1 }, new Date("2026-01-10"));

    expect(result.summary.totalA).toBe(4);
    expect(result.summary.totalB).toBe(2);
    expect(result.matches.find((m) => m.aId === "a1")?.status).toBe("matched");
    expect(result.unmatchedA.map((r) => r.id).sort()).toEqual(["a3", "a4"]);
    expect(result.exceptions.some((e) => e.type === "unmatched" && e.recordRefs.some((r) => r.id === "a4"))).toBe(
      true
    );
    expect(result.exceptions.some((e) => e.type === "mismatch")).toBe(true);
  });

  it("returns zero match rate when both sides are empty", () => {
    const result = runDetection([], [], { windowDays: 3, amountTolerance: 0 });
    expect(result.summary.matchRate).toBe(0);
    expect(result.summary.exceptionCount).toBe(0);
  });
});
