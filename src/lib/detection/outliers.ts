import { mean, standardDeviation, quantile } from "simple-statistics";
import type { DetectedException, DetectionRecord } from "./types";

const Z_SCORE_HIGH = 3;
const Z_SCORE_MEDIUM = 2.5;
const IQR_MULTIPLIER = 1.5;

/**
 * Flags statistical outliers on the amount column of a single source using
 * both z-score (distance from the mean in standard deviations) and IQR
 * (distance from the interquartile range). A record only needs to trip one
 * rule to be flagged; severity escalates when both agree it's extreme.
 * Requires at least 5 records - below that, "outlier" isn't a meaningful
 * statistical claim, so the rule is skipped rather than guessed at.
 */
export function detectOutliers(records: DetectionRecord[], side: "a" | "b"): DetectedException[] {
  if (records.length < 5) return [];

  const amounts = records.map((r) => Math.abs(r.amount));
  const m = mean(amounts);
  const sd = standardDeviation(amounts);
  const q1 = quantile(amounts, 0.25);
  const q3 = quantile(amounts, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - IQR_MULTIPLIER * iqr;
  const upperFence = q3 + IQR_MULTIPLIER * iqr;

  const exceptions: DetectedException[] = [];

  for (const record of records) {
    const value = Math.abs(record.amount);
    const z = sd > 0 ? (value - m) / sd : 0;
    // A zero IQR means the middle 50% of values has no spread at all; the
    // fence would collapse to a single point and flag any trivial deviation,
    // so the IQR rule only applies once there's real spread to measure against.
    const isIqrOutlier = iqr > 0 && (value < lowerFence || value > upperFence);
    const isZOutlier = Math.abs(z) >= Z_SCORE_MEDIUM;

    if (!isIqrOutlier && !isZOutlier) continue;

    const severity =
      Math.abs(z) >= Z_SCORE_HIGH || value > upperFence * 1.5
        ? "high"
        : isIqrOutlier && isZOutlier
        ? "high"
        : "medium";

    exceptions.push({
      type: "outlier",
      severity,
      ruleCode: "STAT_OUTLIER_ZSCORE_IQR",
      ruleDescription: `Amount ${value.toFixed(2)} is ${Math.abs(z).toFixed(
        2
      )} standard deviations from the ${side === "a" ? "source A" : "source B"} mean (${m.toFixed(
        2
      )}) and outside the IQR fence [${lowerFence.toFixed(2)}, ${upperFence.toFixed(2)}].`,
      amount: record.amount,
      recordRefs: [{ side, id: record.id }],
    });
  }

  return exceptions;
}
