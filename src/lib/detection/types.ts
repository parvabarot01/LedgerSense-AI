// Pure, dependency-free types for the detection engine. Deliberately decoupled
// from the Supabase row shapes in @/types/database so this module can be
// tested and reasoned about with plain objects and arrays.

export interface DetectionRecord {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number;
  counterparty?: string | null;
  reference?: string | null;
  description?: string | null;
}

export type ExceptionType = "outlier" | "duplicate" | "mismatch" | "timing_gap" | "unmatched";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";

export interface DetectedException {
  type: ExceptionType;
  severity: ExceptionSeverity;
  ruleCode: string;
  ruleDescription: string;
  amount: number | null;
  recordRefs: { side: "a" | "b"; id: string }[];
}

export interface MatchedPair {
  aId: string;
  bId: string;
  matchType: "exact" | "fuzzy";
  status: "matched" | "disputed";
  amountDelta: number;
  dateDeltaDays: number;
}

export interface MatchOptions {
  windowDays: number;
  amountTolerance: number; // fraction, e.g. 0.01 = 1%
}

export interface DetectionSummary {
  totalA: number;
  totalB: number;
  matchedCount: number;
  disputedCount: number;
  unmatchedACount: number;
  unmatchedBCount: number;
  matchRate: number; // matched / max(totalA, totalB), 0..1
  exceptionCount: number;
}

export interface DetectionResult {
  matches: MatchedPair[];
  unmatchedA: DetectionRecord[];
  unmatchedB: DetectionRecord[];
  exceptions: DetectedException[];
  summary: DetectionSummary;
}
