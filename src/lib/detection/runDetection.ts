import { matchRecords } from "./matching";
import { detectOutliers } from "./outliers";
import { detectDuplicates } from "./duplicates";
import { classifyUnmatched } from "./timingGaps";
import type { DetectedException, DetectionRecord, DetectionResult, MatchOptions } from "./types";

const MISMATCH_SEVERITY_HIGH_DELTA = 100;

function mismatchExceptionsFromDisputedMatches(
  matches: DetectionResult["matches"],
  sourceA: DetectionRecord[],
  sourceB: DetectionRecord[]
): DetectedException[] {
  const aById = new Map(sourceA.map((r) => [r.id, r]));
  const bById = new Map(sourceB.map((r) => [r.id, r]));

  return matches
    .filter((m) => m.status === "disputed")
    .map((m) => {
      const a = aById.get(m.aId);
      const b = bById.get(m.bId);
      const severity =
        Math.abs(m.amountDelta) >= MISMATCH_SEVERITY_HIGH_DELTA || m.dateDeltaDays > 1 ? "high" : "medium";

      return {
        type: "mismatch" as const,
        severity,
        ruleCode: "RECONCILIATION_MISMATCH_AMOUNT_OR_DATE",
        ruleDescription:
          m.amountDelta !== 0
            ? `Matched pair has an amount mismatch of ${m.amountDelta.toFixed(2)} (source A: ${a?.amount.toFixed(
                2
              )}, source B: ${b?.amount.toFixed(2)}).`
            : `Matched pair settled ${m.dateDeltaDays} day(s) apart (source A: ${a?.date}, source B: ${b?.date}).`,
        amount: a?.amount ?? b?.amount ?? null,
        recordRefs: [
          { side: "a" as const, id: m.aId },
          { side: "b" as const, id: m.bId },
        ],
      };
    });
}

/**
 * Runs the full detection pass over one reconciliation set's two sides:
 * deterministic matching, then statistical outliers + duplicates on each
 * side independently, then mismatch flags on disputed (fuzzy) matches, then
 * timing-gap vs. true-unmatched classification on whatever's left over.
 * Pure function - no I/O - so it can run synchronously in an API route for
 * small datasets or be handed to a queue worker for large ones without any
 * change to the logic itself.
 */
export function runDetection(
  sourceA: DetectionRecord[],
  sourceB: DetectionRecord[],
  options: MatchOptions,
  asOf: Date = new Date()
): DetectionResult {
  const { matches, unmatchedA, unmatchedB } = matchRecords(sourceA, sourceB, options);

  const exceptions: DetectedException[] = [
    ...detectOutliers(sourceA, "a"),
    ...detectOutliers(sourceB, "b"),
    ...detectDuplicates(sourceA, "a"),
    ...detectDuplicates(sourceB, "b"),
    ...mismatchExceptionsFromDisputedMatches(matches, sourceA, sourceB),
    ...classifyUnmatched(unmatchedA, "a", options.windowDays, asOf),
    ...classifyUnmatched(unmatchedB, "b", options.windowDays, asOf),
  ];

  const matchedCount = matches.filter((m) => m.status === "matched").length;
  const disputedCount = matches.filter((m) => m.status === "disputed").length;
  const totalA = sourceA.length;
  const totalB = sourceB.length;
  const denominator = Math.max(totalA, totalB, 1);

  return {
    matches,
    unmatchedA,
    unmatchedB,
    exceptions,
    summary: {
      totalA,
      totalB,
      matchedCount,
      disputedCount,
      unmatchedACount: unmatchedA.length,
      unmatchedBCount: unmatchedB.length,
      matchRate: Math.round((matchedCount / denominator) * 10000) / 10000,
      exceptionCount: exceptions.length,
    },
  };
}

export * from "./types";
export { matchRecords } from "./matching";
export { detectOutliers } from "./outliers";
export { detectDuplicates } from "./duplicates";
export { classifyUnmatched } from "./timingGaps";
