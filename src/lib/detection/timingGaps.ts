import type { DetectedException, DetectionRecord } from "./types";

const TIMING_GAP_MULTIPLIER = 2;
const UNMATCHED_CRITICAL_MULTIPLIER = 4;

function daysSince(date: string, asOf: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((asOf.getTime() - new Date(date).getTime()) / msPerDay);
}

/**
 * Splits records left unmatched by the matching pass into two buckets:
 * "timing_gap" (recently outside the settlement window - likely to resolve
 * itself once the counterpart shows up) vs "unmatched" (old enough that a
 * real reconciliation break, not just settlement lag, is the more likely
 * explanation). The threshold is a multiple of the reconciliation set's own
 * match window, so a 3-day-window set and a 14-day-window set each get a
 * threshold proportional to their own definition of "normal" timing.
 */
export function classifyUnmatched(
  records: DetectionRecord[],
  side: "a" | "b",
  windowDays: number,
  asOf: Date = new Date()
): DetectedException[] {
  const timingGapThreshold = windowDays * TIMING_GAP_MULTIPLIER;
  const criticalThreshold = windowDays * UNMATCHED_CRITICAL_MULTIPLIER;

  return records.map((record) => {
    const age = daysSince(record.date, asOf);
    const isTimingGap = age <= timingGapThreshold;

    if (isTimingGap) {
      return {
        type: "timing_gap" as const,
        severity: "low" as const,
        ruleCode: "TIMING_GAP_WITHIN_THRESHOLD",
        ruleDescription: `No counterpart found yet, but this record is only ${age} day(s) old against a ${windowDays}-day match window - likely still in transit.`,
        amount: record.amount,
        recordRefs: [{ side, id: record.id }],
      };
    }

    return {
      type: "unmatched" as const,
      severity: age >= criticalThreshold ? ("critical" as const) : ("high" as const),
      ruleCode: "UNMATCHED_NO_COUNTERPART",
      ruleDescription: `No counterpart found in ${side === "a" ? "source B" : "source A"} within the ${windowDays}-day match window; record is ${age} day(s) old.`,
      amount: record.amount,
      recordRefs: [{ side, id: record.id }],
    };
  });
}
