-- Row-level security. Every table is scoped to an organization; access is
-- gated by membership, with role checks layered on top for governance-
-- sensitive actions (creating orgs, approving resolutions, managing members).
-- Defense in depth: API routes validate roles too, but RLS is the backstop.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can read memberships regardless
-- of the calling row's RLS, without themselves leaking data)
-- ---------------------------------------------------------------------------

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function has_org_role(target_org uuid, roles org_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid() and role = any(roles)
  );
$$;

create or replace function current_org_role(target_org uuid)
returns org_role
language sql
security definer
set search_path = public
stable
as $$
  select role from memberships
  where org_id = target_org and user_id = auth.uid()
  limit 1;
$$;

-- Auto-provision an owner membership when a user creates an organization.
-- Guarded on auth.uid() so service-role inserts (seed scripts, admin
-- tooling) can create an organization without a null-user_id membership
-- insert failing the whole transaction; those callers add memberships
-- explicitly instead.
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into memberships (org_id, user_id, role)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;

create trigger organizations_after_insert
  after insert on organizations
  for each row execute function handle_new_organization();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table data_sources enable row level security;
alter table transactions enable row level security;
alter table ledger_entries enable row level security;
alter table reconciliation_sets enable row level security;
alter table detection_runs enable row level security;
alter table matches enable row level security;
alter table exceptions enable row level security;
alter table explanations enable row level security;
alter table resolutions enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create policy organizations_select on organizations
  for select using (is_org_member(id));

create policy organizations_insert on organizations
  for insert with check (auth.uid() is not null);

create policy organizations_update on organizations
  for update using (has_org_role(id, array['owner', 'admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------

create policy memberships_select on memberships
  for select using (is_org_member(org_id));

create policy memberships_insert on memberships
  for insert with check (has_org_role(org_id, array['owner', 'admin']::org_role[]));

create policy memberships_update on memberships
  for update using (has_org_role(org_id, array['owner', 'admin']::org_role[]));

create policy memberships_delete on memberships
  for delete using (has_org_role(org_id, array['owner', 'admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- data_sources
-- ---------------------------------------------------------------------------

create policy data_sources_select on data_sources
  for select using (is_org_member(org_id));

create policy data_sources_insert on data_sources
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));

create policy data_sources_update on data_sources
  for update using (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));

create policy data_sources_delete on data_sources
  for delete using (has_org_role(org_id, array['owner', 'admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- transactions / ledger_entries (ingested rows)
-- ---------------------------------------------------------------------------

create policy transactions_select on transactions
  for select using (is_org_member(org_id));
create policy transactions_insert on transactions
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
create policy transactions_update on transactions
  for update using (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));

create policy ledger_entries_select on ledger_entries
  for select using (is_org_member(org_id));
create policy ledger_entries_insert on ledger_entries
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
create policy ledger_entries_update on ledger_entries
  for update using (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));

-- ---------------------------------------------------------------------------
-- reconciliation_sets
-- ---------------------------------------------------------------------------

create policy reconciliation_sets_select on reconciliation_sets
  for select using (is_org_member(org_id));
create policy reconciliation_sets_insert on reconciliation_sets
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
create policy reconciliation_sets_update on reconciliation_sets
  for update using (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
create policy reconciliation_sets_delete on reconciliation_sets
  for delete using (has_org_role(org_id, array['owner', 'admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- detection_runs / matches (system-written, org members read)
-- ---------------------------------------------------------------------------

create policy detection_runs_select on detection_runs
  for select using (is_org_member(org_id));
create policy detection_runs_insert on detection_runs
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
create policy detection_runs_update on detection_runs
  for update using (is_org_member(org_id));

create policy matches_select on matches
  for select using (is_org_member(org_id));
create policy matches_insert on matches
  for insert with check (is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- exceptions
-- ---------------------------------------------------------------------------

create policy exceptions_select on exceptions
  for select using (is_org_member(org_id));
create policy exceptions_insert on exceptions
  for insert with check (is_org_member(org_id));
create policy exceptions_update on exceptions
  for update using (has_org_role(org_id, array['owner', 'admin', 'analyst', 'checker']::org_role[]));

-- ---------------------------------------------------------------------------
-- explanations (system-written via server route using the flagged rows)
-- ---------------------------------------------------------------------------

create policy explanations_select on explanations
  for select using (is_org_member(org_id));
create policy explanations_insert on explanations
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst', 'checker']::org_role[]));

-- ---------------------------------------------------------------------------
-- resolutions (maker proposes, checker decides)
-- ---------------------------------------------------------------------------

create policy resolutions_select on resolutions
  for select using (is_org_member(org_id));
create policy resolutions_insert on resolutions
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'analyst']::org_role[]));
-- A checker can never decide their own proposal - enforced here at the
-- database level too, not just in the decideResolution server action, since
-- this is the one governance rule the whole maker-checker promise rests on.
create policy resolutions_update on resolutions
  for update using (
    has_org_role(org_id, array['owner', 'admin', 'checker']::org_role[])
    and proposed_by <> auth.uid()
  );

-- ---------------------------------------------------------------------------
-- audit_log (append-only for members; no update/delete policy means no one
-- can mutate history through PostgREST, even admins)
-- ---------------------------------------------------------------------------

create policy audit_log_select on audit_log
  for select using (is_org_member(org_id));
create policy audit_log_insert on audit_log
  for insert with check (is_org_member(org_id));
