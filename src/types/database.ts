// Hand-written mirror of supabase/migrations/*.sql. Regenerate by hand when the
// schema changes (no live Supabase project to run `supabase gen types` against
// during this build pass).

export type OrgRole = "owner" | "admin" | "analyst" | "checker" | "auditor";
export type DataSourceKind = "transaction" | "ledger";
export type DataSourceOrigin = "bank_feed" | "ledger" | "processor" | "other";
export type ExceptionType = "outlier" | "duplicate" | "mismatch" | "timing_gap" | "unmatched";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "in_review" | "sealed" | "dismissed";
export type MatchType = "exact" | "fuzzy";
export type MatchStatus = "matched" | "disputed";
export type DetectionRunStatus = "queued" | "running" | "completed" | "failed";
export type ResolutionAction = "match" | "write_off" | "escalate" | "dismiss";
export type ResolutionStatus = "pending" | "approved" | "rejected";
export type RecordKind = "transaction" | "ledger_entry";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface DataSource {
  id: string;
  org_id: string;
  name: string;
  kind: DataSourceKind;
  origin: DataSourceOrigin;
  column_mapping: Record<string, string>;
  storage_path: string | null;
  row_count: number;
  created_at: string;
  created_by: string | null;
}

export interface LedgerRecord {
  id: string;
  org_id: string;
  data_source_id: string;
  external_ref: string | null;
  txn_date?: string;
  entry_date?: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  description: string | null;
  raw: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface ReconciliationSet {
  id: string;
  org_id: string;
  name: string;
  source_a_id: string;
  source_b_id: string;
  match_window_days: number;
  amount_tolerance: number;
  created_at: string;
  created_by: string | null;
}

export interface DetectionRun {
  id: string;
  org_id: string;
  reconciliation_set_id: string;
  status: DetectionRunStatus;
  total_a: number;
  total_b: number;
  matched_count: number;
  exception_count: number;
  match_rate: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  org_id: string;
  reconciliation_set_id: string;
  detection_run_id: string;
  source_a_record_id: string;
  source_b_record_id: string;
  match_type: MatchType;
  status: MatchStatus;
  amount_delta: number;
  date_delta_days: number;
  created_at: string;
}

export interface RecordRef {
  table: RecordKind;
  id: string;
}

export interface ExceptionRow {
  id: string;
  org_id: string;
  reconciliation_set_id: string;
  detection_run_id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  rule_code: string;
  rule_description: string;
  amount: number | null;
  age_days: number;
  record_refs: RecordRef[];
  created_at: string;
}

export interface Explanation {
  id: string;
  org_id: string;
  exception_id: string;
  summary: string;
  grounded_rule: string;
  suggested_resolution: string;
  model: string;
  created_at: string;
}

export interface Resolution {
  id: string;
  org_id: string;
  exception_id: string;
  action: ResolutionAction;
  notes: string | null;
  status: ResolutionStatus;
  proposed_by: string;
  proposed_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> };
      memberships: { Row: Membership; Insert: Partial<Membership>; Update: Partial<Membership> };
      data_sources: { Row: DataSource; Insert: Partial<DataSource>; Update: Partial<DataSource> };
      transactions: { Row: LedgerRecord; Insert: Partial<LedgerRecord>; Update: Partial<LedgerRecord> };
      ledger_entries: { Row: LedgerRecord; Insert: Partial<LedgerRecord>; Update: Partial<LedgerRecord> };
      reconciliation_sets: { Row: ReconciliationSet; Insert: Partial<ReconciliationSet>; Update: Partial<ReconciliationSet> };
      detection_runs: { Row: DetectionRun; Insert: Partial<DetectionRun>; Update: Partial<DetectionRun> };
      matches: { Row: Match; Insert: Partial<Match>; Update: Partial<Match> };
      exceptions: { Row: ExceptionRow; Insert: Partial<ExceptionRow>; Update: Partial<ExceptionRow> };
      explanations: { Row: Explanation; Insert: Partial<Explanation>; Update: Partial<Explanation> };
      resolutions: { Row: Resolution; Insert: Partial<Resolution>; Update: Partial<Resolution> };
      audit_log: { Row: AuditLogEntry; Insert: Partial<AuditLogEntry>; Update: Partial<AuditLogEntry> };
    };
  };
}
