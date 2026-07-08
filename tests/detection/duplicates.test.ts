import { describe, expect, it } from "vitest";
import { detectDuplicates } from "@/lib/detection/duplicates";
import type { DetectionRecord } from "@/lib/detection/types";

const rec = (id: string, date: string, amount: number, counterparty: string): DetectionRecord => ({
  id,
  date,
  amount,
  counterparty,
});

describe("detectDuplicates", () => {
  it("flags same amount+counterparty within the window", () => {
    const records = [
      rec("a1", "2026-01-05", 250, "Acme Corp"),
      rec("a2", "2026-01-06", 250, "Acme Corp"),
    ];

    const exceptions = detectDuplicates(records, "a");
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].recordRefs).toHaveLength(2);
  });

  it("does not flag same amount+counterparty far apart in time", () => {
    const records = [
      rec("a1", "2026-01-05", 250, "Acme Corp"),
      rec("a2", "2026-06-05", 250, "Acme Corp"),
    ];

    expect(detectDuplicates(records, "a")).toHaveLength(0);
  });

  it("does not flag different counterparties with the same amount", () => {
    const records = [
      rec("a1", "2026-01-05", 250, "Acme Corp"),
      rec("a2", "2026-01-05", 250, "Widget Inc"),
    ];

    expect(detectDuplicates(records, "a")).toHaveLength(0);
  });

  it("escalates severity for clusters of 3 or more", () => {
    const records = [
      rec("a1", "2026-01-05", 250, "Acme Corp"),
      rec("a2", "2026-01-06", 250, "Acme Corp"),
      rec("a3", "2026-01-07", 250, "Acme Corp"),
    ];

    const exceptions = detectDuplicates(records, "a");
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].severity).toBe("high");
    expect(exceptions[0].recordRefs).toHaveLength(3);
  });
});
