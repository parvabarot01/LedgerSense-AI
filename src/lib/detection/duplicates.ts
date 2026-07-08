import type { DetectedException, DetectionRecord } from "./types";

const DUPLICATE_WINDOW_DAYS = 3;

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / msPerDay));
}

/**
 * Flags same-amount, same-counterparty records that land within a short
 * window of each other - the classic "payment submitted twice" or
 * "duplicate feed row" pattern. Grouped first by amount+counterparty (cheap,
 * exact) then split into date-proximity clusters, so two genuinely unrelated
 * $50 charges to the same counterparty six months apart are not flagged.
 */
export function detectDuplicates(records: DetectionRecord[], side: "a" | "b"): DetectedException[] {
  const groups = new Map<string, DetectionRecord[]>();

  for (const record of records) {
    const key = `${record.amount.toFixed(2)}|${(record.counterparty ?? "").trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const exceptions: DetectedException[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cluster: DetectionRecord[] = [sorted[0]];

    const flushCluster = () => {
      if (cluster.length > 1) {
        exceptions.push({
          type: "duplicate",
          severity: cluster.length > 2 ? "high" : "medium",
          ruleCode: "DUPLICATE_AMOUNT_COUNTERPARTY_WINDOW",
          ruleDescription: `${cluster.length} records of ${cluster[0].amount.toFixed(2)} to "${
            cluster[0].counterparty || "(no counterparty)"
          }" within a ${DUPLICATE_WINDOW_DAYS}-day window.`,
          amount: cluster[0].amount,
          recordRefs: cluster.map((r) => ({ side, id: r.id })),
        });
      }
      cluster = [];
    };

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (daysBetween(prev.date, curr.date) <= DUPLICATE_WINDOW_DAYS) {
        cluster.push(curr);
      } else {
        flushCluster();
        cluster = [curr];
      }
    }
    flushCluster();
  }

  return exceptions;
}
