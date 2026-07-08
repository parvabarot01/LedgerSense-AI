# Architecture

## Stack

Next.js 14 (App Router, TypeScript) on Vercel's free tier. Supabase (Postgres,
Auth, Storage, Row-Level Security) for all persistence and multi-tenancy.
Upstash Redis (rate limiting) and Upstash QStash (async detection jobs), both
free tier. Groq (Llama 3.3 70B) for AI explanations and natural-language
query. `simple-statistics` for the detection math. See `.env.example` for
every credential the app needs; nothing here is connected until those are
filled in.

## Multi-tenancy and data model

Every table (except `organizations` itself) carries an `org_id` and is
scoped by Postgres Row-Level Security: a user can only read/write rows in
organizations they have a `memberships` row for (see
`supabase/migrations/0002_rls.sql`, helper functions `is_org_member` /
`has_org_role`). Role-gated actions (creating an org's data, approving
resolutions, managing membership) check the role in application code as
well, so a rejected write returns a clean 403 with a reason instead of a
raw Postgres RLS error (`src/lib/membership.ts`); RLS remains the backstop
if a route ever forgets that check.

Roles: `owner`, `admin`, `analyst`, `checker`, `auditor`. Analysts create
data sources and reconciliation sets and propose resolutions; checkers (or
admins/owners) approve or reject them, and can never approve their own
proposal; auditors have read-only access everywhere, including audit
report export.

### Core tables

- **`organizations`**, **`memberships`** — tenancy root. An `organizations`
  insert trigger auto-provisions the creator as `owner`, guarded on
  `auth.uid() is not null` so service-role writes (seed scripts) can create
  an org without a null-user membership insert failing.
- **`data_sources`** — a bank feed, processor, or internal ledger. `kind`
  (`transaction` | `ledger`) determines which table its rows live in.
- **`transactions`** / **`ledger_entries`** — normalized ingested rows
  (identical shape, kept as separate tables per the product's own bank-vs-
  ledger mental model rather than one generic "records" table).
- **`reconciliation_sets`** — pairs two data sources with a match window
  (days) and amount tolerance (fraction).
- **`detection_runs`** — one row per detection pass: status, totals, match
  rate, timestamps.
- **`matches`** — matched/disputed pairs produced by a run.
- **`exceptions`** — typed, severity-ranked flags, always carrying the
  triggering `rule_code`/`rule_description` and `record_refs` (a JSON array
  of `{table, id}` pointing at the exact flagged rows).
- **`explanations`** — AI-generated, grounded explanations per exception.
- **`resolutions`** — the maker-checker trail: proposer, action, decision,
  decider, timestamps, notes.
- **`audit_log`** — append-only (no update/delete RLS policy exists, so no
  role can rewrite history through the API); every dataset mutation,
  detection run, exception status change, and approval decision writes a
  row via `src/lib/audit.ts`.

Full DDL: `supabase/migrations/0001_init.sql` (schema), `0002_rls.sql`
(policies + helper functions + the org-creation trigger), `0003_storage.sql`
(the `raw-uploads` Storage bucket and its path-scoped RLS policies).

### Why manual joins instead of embedded PostgREST selects

`src/types/database.ts` is hand-written (no live Supabase project to run
`supabase gen types` against yet). PostgREST's embedded resource selects
(`.select("role, organizations(*)")`) need accurate `Relationships`
metadata per table to type-check and resolve correctly; hand-rolling that
metadata without a live schema to verify it against is a real source of
silent bugs. The codebase standardizes on separate queries joined in
application code instead (see `src/lib/org.ts`) — simpler, and correct by
construction rather than by hoping the hand-written metadata matches reality.

## Detection engine and execution path

See `DETECTION_METHODOLOGY.md` for the rules themselves. Architecturally:
`src/lib/detection/*` (matching, outliers, duplicates, timing gaps,
orchestration) is pure and dependency-free — no Supabase import anywhere in
that folder — so it's fully unit-testable without any live service (see
`tests/detection/`). `src/lib/detection/executeRun.ts` is the I/O shell:
it loads records, calls the pure engine, and persists the result. It's
called two ways:

- **Synchronous**, inline in the `triggerDetectionRun` server action, when
  QStash isn't configured (the local-dev default).
- **Asynchronously**, via a QStash job that calls back to
  `POST /api/detection/callback`, signature-verified with
  `@upstash/qstash`'s `Receiver`, using a service-role Supabase client
  (there's no user session in a webhook request).

## AI layer

`src/lib/ai/groq.ts` wraps the Groq client behind a `groqConfigured` guard;
every caller checks it and returns a clear "not enabled yet" error rather
than crashing when `GROQ_API_KEY` is absent. `explain.ts` and `query.ts`
both hand the model only the specific rows relevant to the request and a
system prompt that forbids inventing anything else (see
`DETECTION_METHODOLOGY.md` for the grounding details).

## API surface

Most mutations are Next.js Server Actions (`src/app/actions/*.ts`) rather
than REST route handlers — they get the same validation, rate limiting, and
role checks, without a separate fetch/CORS layer, and bind directly to forms
and buttons. Two things are real HTTP route handlers because they must be:

- **`POST /api/detection/callback`** — QStash's webhook target; QStash
  calls back over HTTP and signs the request, which only a route handler
  can verify.
- **`GET /api/reports/audit`** — the audit CSV export, since a file download
  needs a real response with `Content-Disposition`, not a server action.

Every mutation validates its input against a Zod schema
(`src/lib/validation/schemas.ts`) before touching the database.

## Security playbook

- **RLS on every table**, role checks layered on top in application code.
- **Rate limiting** (`src/lib/rateLimit.ts`, Upstash-backed) on ingestion,
  detection, and AI endpoints — the three surfaces that are either
  expensive (large CSV rows, statistical passes) or call a metered external
  API (Groq). Degrades to always-allow when Upstash isn't configured yet,
  so local dev works before the user connects a real Redis instance —
  but that means **rate limiting is not actually enforced until
  `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set**; this is the one security
  control that's a no-op out of the box, by design, not an oversight.
- **Security headers** (`src/middleware.ts`): `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`.
- **Audit log** on every dataset mutation, detection run, exception status
  change, and approval decision, append-only at the database level.
- **Zod validation** on every route/action's input.

## Free-tier ceilings (zero-dollar constraint)

Noted here rather than exceeded silently, per the project's non-negotiable
zero-dollar rule:

- **Vercel Hobby**: serverless function body/response size limits (~4.5MB)
  cap how large a single CSV ingest request or audit CSV export can be in
  one request. The ingestion Zod schema caps a single request at 20,000
  rows as a practical ceiling under that ~4.5MB budget.
- **Supabase free tier**: 500MB database storage, 1GB file storage, and a
  project pauses after a week of no API requests (resumes on the next
  request, capped restore count/month). Fine for a demo/design-partner
  scale product; a real production tenant base would need to move to a
  paid Supabase plan.
- **Upstash Redis/QStash free tier**: request-count ceilings (10K
  commands/day Redis, 500 messages/day QStash on the free tier at time of
  writing). The QStash async path is only used when configured; below that
  message ceiling, detection runs fall back to the synchronous in-request
  path automatically.
- **Groq free tier**: request-rate limits per model; the AI rate limiter
  (`rateLimit.ai`) exists specifically to keep the app's own usage under
  Groq's ceiling once Upstash is connected, not just to prevent abuse.
- **Google Fonts (Fraunces/Inter/IBM Plex Mono)**: fetched at build time via
  `next/font/google`; no runtime dependency on Google's CDN once built; no
  cost, no account needed.
