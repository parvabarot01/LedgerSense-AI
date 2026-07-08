-- LedgerSense core schema
-- Multi-tenant model: every row belongs to an organization; access is gated by
-- membership (see 0002_rls.sql). Run against a fresh Supabase project via the
-- SQL editor or `supabase db push`.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_role as enum ('owner', 'admin', 'analyst', 'checker', 'auditor');
create type data_source_kind as enum ('transaction', 'ledger');
create type data_source_origin as enum ('bank_feed', 'ledger', 'processor', 'other');
create type exception_type as enum ('outlier', 'duplicate', 'mismatch', 'timing_gap', 'unmatched');
create type exception_severity as enum ('low', 'medium', 'high', 'critical');
create type exception_status as enum ('open', 'in_review', 'sealed', 'dismissed');
create type match_type as enum ('exact', 'fuzzy');
create type match_status as enum ('matched', 'disputed');
create type detection_run_status as enum ('queued', 'running', 'completed', 'failed');
create type resolution_action as enum ('match', 'write_off', 'escalate', 'dismiss');
create type resolution_status as enum ('pending', 'approved', 'rejected');
create type record_kind as enum ('transaction', 'ledger_entry');

-- ---------------------------------------------------------------------------
-- Organizations & membership (multi-tenancy root)
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'analyst',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_user_id_idx on memberships(user_id);
create index memberships_org_id_idx on memberships(org_id);

-- ---------------------------------------------------------------------------
-- Data sources
-- ---------------------------------------------------------------------------

create table data_sources (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  kind data_source_kind not null,
  origin data_source_origin not null default 'other',
  column_mapping jsonb not null default '{}'::jsonb,
  storage_path text,
  row_count int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index data_sources_org_id_idx on data_sources(org_id);

-- ---------------------------------------------------------------------------
-- Transactions & ledger entries (normalized ingested rows)
-- ---------------------------------------------------------------------------

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  data_source_id uuid not null references data_sources(id) on delete cascade,
  external_ref text,
  txn_date date not null,
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  counterparty text,
  description text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index transactions_org_id_idx on transactions(org_id);
create index transactions_data_source_id_idx on transactions(data_source_id);
create index transactions_txn_date_idx on transactions(txn_date);
create index transactions_amount_idx on transactions(amount);

create table ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  data_source_id uuid not null references data_sources(id) on delete cascade,
  external_ref text,
  entry_date date not null,
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  counterparty text,
  description text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index ledger_entries_org_id_idx on ledger_entries(org_id);
create index ledger_entries_data_source_id_idx on ledger_entries(data_source_id);
create index ledger_entries_entry_date_idx on ledger_entries(entry_date);
create index ledger_entries_amount_idx on ledger_entries(amount);

-- ---------------------------------------------------------------------------
-- Reconciliation sets (pair two data sources)
-- ---------------------------------------------------------------------------

create table reconciliation_sets (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  source_a_id uuid not null references data_sources(id) on delete cascade,
  source_b_id uuid not null references data_sources(id) on delete cascade,
  match_window_days int not null default 3,
  amount_tolerance numeric(6, 4) not null default 0.0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (source_a_id <> source_b_id)
);

create index reconciliation_sets_org_id_idx on reconciliation_sets(org_id);

-- ---------------------------------------------------------------------------
-- Detection runs (one per execution of the engine against a reconciliation set)
-- ---------------------------------------------------------------------------

create table detection_runs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  reconciliation_set_id uuid not null references reconciliation_sets(id) on delete cascade,
  status detection_run_status not null default 'queued',
  total_a int not null default 0,
  total_b int not null default 0,
  matched_count int not null default 0,
  exception_count int not null default 0,
  match_rate numeric(5, 4),
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index detection_runs_reconciliation_set_id_idx on detection_runs(reconciliation_set_id);
create index detection_runs_org_id_idx on detection_runs(org_id);

-- ---------------------------------------------------------------------------
-- Matches (matched pairs produced by a detection run)
-- ---------------------------------------------------------------------------

create table matches (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  reconciliation_set_id uuid not null references reconciliation_sets(id) on delete cascade,
  detection_run_id uuid not null references detection_runs(id) on delete cascade,
  source_a_record_id uuid not null,
  source_b_record_id uuid not null,
  match_type match_type not null,
  status match_status not null default 'matched',
  amount_delta numeric(14, 2) not null default 0,
  date_delta_days int not null default 0,
  created_at timestamptz not null default now()
);

create index matches_reconciliation_set_id_idx on matches(reconciliation_set_id);
create index matches_detection_run_id_idx on matches(detection_run_id);

-- ---------------------------------------------------------------------------
-- Exceptions (typed, severity-ranked flags, always linked to the triggering rule + rows)
-- ---------------------------------------------------------------------------

create table exceptions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  reconciliation_set_id uuid not null references reconciliation_sets(id) on delete cascade,
  detection_run_id uuid not null references detection_runs(id) on delete cascade,
  type exception_type not null,
  severity exception_severity not null default 'medium',
  status exception_status not null default 'open',
  rule_code text not null,
  rule_description text not null,
  amount numeric(14, 2),
  age_days int not null default 0,
  record_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index exceptions_reconciliation_set_id_idx on exceptions(reconciliation_set_id);
create index exceptions_org_id_idx on exceptions(org_id);
create index exceptions_status_idx on exceptions(status);
create index exceptions_severity_idx on exceptions(severity);

-- ---------------------------------------------------------------------------
-- AI explanations (grounded in the exception's exact rows + rule)
-- ---------------------------------------------------------------------------

create table explanations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  exception_id uuid not null references exceptions(id) on delete cascade,
  summary text not null,
  grounded_rule text not null,
  suggested_resolution text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index explanations_exception_id_idx on explanations(exception_id);

-- ---------------------------------------------------------------------------
-- Resolutions (maker-checker workflow)
-- ---------------------------------------------------------------------------

create table resolutions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  exception_id uuid not null references exceptions(id) on delete cascade,
  action resolution_action not null,
  notes text,
  status resolution_status not null default 'pending',
  proposed_by uuid not null references auth.users(id),
  proposed_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_notes text
);

create index resolutions_exception_id_idx on resolutions(exception_id);
create index resolutions_status_idx on resolutions(status);

-- ---------------------------------------------------------------------------
-- Audit log (every mutation of financial data or governance decision)
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_id_idx on audit_log(org_id);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_created_at_idx on audit_log(created_at desc);
