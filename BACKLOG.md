# Backlog

Living, sprint-tagged backlog. All three sprints are being built in a single continuous
pass (not gated for review between sprints), so all are listed up front. Checked items are
shipped; each ships as its own commit.

## Sprint 1 — Foundation, Data Ingestion & Ledger Model

- [x] Project scaffold: Next.js 14 App Router + TypeScript + Tailwind, repo hygiene (`.gitignore`, conventional commits)
- [x] Design system foundation — tokens, type scale, motion timing, `DESIGN_SYSTEM.md`
- [x] Database schema — organizations, users, memberships, data_sources, transactions, ledger_entries, reconciliation_sets, audit_log (SQL migrations + RLS)
- [x] Auth + organizations + RBAC (owner/admin/analyst/checker/auditor roles) via Supabase Auth
- [x] Audit log — change history on every dataset and record mutation
- [x] App shell — persistent left sidebar, calm ledger-paper layout
- [x] CSV ingestion — upload to Supabase Storage, column mapping, validation, normalization
- [x] Synthetic data seed scripts (bank feed, ledger, processor payouts)
- [x] Data explorer UI — browse/filter/search transactions and ledger entries per data source
- [x] Reconciliation set definition — pair two data sources for reconciliation
- [x] CI to Vercel (config only — `vercel.json` + GitHub Actions build/test workflow; actual Vercel project connection left to user)
- [x] PM docs: `PRD.md`, `PERSONAS.md`, `COMPETITIVE_ANALYSIS.md`, `KPI_FRAMEWORK.md` (draft), `ROADMAP.md`

## Sprint 2 — Anomaly Detection & Reconciliation Engine

- [x] Detection engine core — pure statistical functions (z-score/IQR outliers, duplicate/near-duplicate detection)
- [x] Matching engine — deterministic pass (exact then fuzzy amount/date/reference) producing matched/unmatched/disputed buckets
- [x] Reconciliation-mismatch + timing-gap rules
- [x] Detection run orchestration (QStash-based async job — code path + local synchronous fallback for dev without a queue)
- [x] Exception model + persistence — typed, severity-ranked, rule-linked, row-linked
- [x] Exception queue UI — severity/amount/age ordering, status chips
- [x] Detection dashboard — match rate, exception counts by type/severity, drilldown
- [x] `DETECTION_METHODOLOGY.md`, `ARCHITECTURE.md` full schema + API write-up

## Sprint 3 — AI Copilot, Maker-Checker, Executive Layer, Launch Polish

- [x] AI Explanation Copilot — Groq-backed, grounded in flagged rows + triggered rule, with suggested resolution
- [x] Exception detail drawer — flagged rows, rule, trace-blue explanation, resolution suggestion, action bar
- [x] Natural-language query over reconciliation data (grounded)
- [x] Maker-checker workflow — propose/approve/reject, full approval trail, brass-seal UI moment
- [x] Resolution audit report — exportable, per exception: explanation, rule, approval chain
- [x] Executive dashboard — health per set, open/resolved, aging, risk-scored largest/oldest breaks
- [x] Hardening — RLS policy audit, rate limiting (Upstash) on ingestion/detection endpoints, security headers, Zod validation on every route
- [x] Test coverage on detection/matching engine (core-flow tests)
- [x] `GTM_STRATEGY.md`, `PRICING_STRATEGY.md`, final `EXECUTIVE_SUMMARY.md`, `NORTH_STAR_METRIC.md`, `README.md`

## Explicitly deferred to the user (online-service connections)

- [x] Create GitHub remote and push (repo connected mid-build at the user's request; pushed after every feature above)
- [ ] Create Supabase project, run migrations (`supabase/migrations/*.sql`), set env vars
- [ ] Create Upstash Redis + QStash instances, set env vars
- [ ] Create Groq API key, set env var
- [ ] Connect Vercel project for deploys
- [ ] Run `npm run seed -- --org=<your-workspace-slug>` once Supabase is connected, to load demo data
