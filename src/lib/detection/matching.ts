import type { DetectionRecord, MatchOptions, MatchedPair } from "./types";

const AMOUNT_EPSILON = 0.005;

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / msPerDay));
}

interface Candidate {
  aIndex: number;
  bIndex: number;
  dateDeltaDays: number;
  amountDelta: number;
  isExact: boolean;
}

/**
 * Deterministic two-pass match: exact matches (same amount, same date or
 * reference) are preferred over fuzzy ones, and each record can only be
 * consumed by a single pair. Greedy assignment by best score is used instead
 * of an optimal bipartite match (e.g. Hungarian algorithm) because
 * reconciliation data is sparse enough that greedy-by-best-score gives the
 * same practical result while staying easy to audit and explain to a user.
 */
export function matchRecords(
  sourceA: DetectionRecord[],
  sourceB: DetectionRecord[],
  options: MatchOptions
): { matches: MatchedPair[]; unmatchedA: DetectionRecord[]; unmatchedB: DetectionRecord[] } {
  const candidates: Candidate[] = [];

  for (let ai = 0; ai < sourceA.length; ai++) {
    const a = sourceA[ai];
    for (let bi = 0; bi < sourceB.length; bi++) {
      const b = sourceB[bi];
      const dateDeltaDays = daysBetween(a.date, b.date);
      if (dateDeltaDays > options.windowDays) continue;

      const amountDelta = Math.round((a.amount - b.amount) * 100) / 100;
      const tolerance = options.amountTolerance * Math.max(Math.abs(a.amount), Math.abs(b.amount), 1);
      if (Math.abs(amountDelta) > Math.max(tolerance, AMOUNT_EPSILON)) continue;

      const sameReference =
        !!a.reference && !!b.reference && a.reference.trim().toLowerCase() === b.reference.trim().toLowerCase();
      const isExact = Math.abs(amountDelta) <= AMOUNT_EPSILON && (dateDeltaDays === 0 || sameReference);

      candidates.push({ aIndex: ai, bIndex: bi, dateDeltaDays, amountDelta, isExact });
    }
  }

  candidates.sort((x, y) => {
    if (x.isExact !== y.isExact) return x.isExact ? -1 : 1;
    if (x.dateDeltaDays !== y.dateDeltaDays) return x.dateDeltaDays - y.dateDeltaDays;
    return Math.abs(x.amountDelta) - Math.abs(y.amountDelta);
  });

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const matches: MatchedPair[] = [];

  for (const c of candidates) {
    if (usedA.has(c.aIndex) || usedB.has(c.bIndex)) continue;
    usedA.add(c.aIndex);
    usedB.add(c.bIndex);
    matches.push({
      aId: sourceA[c.aIndex].id,
      bId: sourceB[c.bIndex].id,
      matchType: c.isExact ? "exact" : "fuzzy",
      status: c.isExact ? "matched" : "disputed",
      amountDelta: c.amountDelta,
      dateDeltaDays: c.dateDeltaDays,
    });
  }

  const unmatchedA = sourceA.filter((_, i) => !usedA.has(i));
  const unmatchedB = sourceB.filter((_, i) => !usedB.has(i));

  return { matches, unmatchedA, unmatchedB };
}
