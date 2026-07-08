# Project Plan

## Vision

LedgerSense is an AI financial anomaly-detection and reconciliation copilot. It ingests
transaction and ledger data, detects anomalies (duplicates, outliers, mismatches, timing
gaps) using statistical methods, and uses an LLM to explain, grounded in the actual flagged
rows and a stated rule, why each item was flagged and what to do about it, all behind a
maker-checker approval workflow before anything is resolved. See `PRD.md` for the full
requirements and `PERSONAS.md` for who it's built for.

## Build approach

The build was run as one continuous pass rather than three separately reviewed sprints, to
get a fully working, demoable loop (ingest -> detect -> explain -> approve -> report) in
place before iterating further. The milestones below reflect the same scope the original
three-sprint plan called for.

### Milestone 1 — Foundation, data ingestion & ledger model

Multi-tenant auth/orgs/RBAC with a full audit trail, the core schema (organizations, data
sources, transactions, ledger entries, reconciliation sets), CSV ingestion with column
mapping and normalization, synthetic seed data, a data explorer, reconciliation set
definition, and the design system foundation (see `DESIGN_SYSTEM.md`).

### Milestone 2 — Anomaly detection & reconciliation engine

The detection engine: statistical outliers (z-score/IQR), duplicate/near-duplicate
detection, reconciliation mismatches, and timing gaps, plus a deterministic matching pass
(exact then fuzzy) producing matched/unmatched/disputed buckets. Every flag persists as a
typed, severity-ranked exception traceable to its exact rows and rule. See
`DETECTION_METHODOLOGY.md` and `ARCHITECTURE.md`.

### Milestone 3 — AI copilot, maker-checker governance, executive layer

Grounded AI explanations and a suggested resolution per exception, natural-language query
over reconciliation data, a full maker-checker approval workflow with an audit trail, an
exportable resolution audit report, and an executive dashboard (reconciliation health, aging,
largest/oldest breaks). Hardening pass: RLS audit, rate limiting, security headers, input
validation, and core-flow test coverage on the detection engine.

## Tech stack

All free-tier: Next.js 14 (App Router) + TypeScript + Tailwind on Vercel; Supabase
(Postgres/Auth/Storage/RLS) for multi-tenant data; Upstash Redis + QStash for async
detection jobs; `simple-statistics` for the detection math; Groq (Llama 3.3 70B) for the
explanation and query layer. See `ARCHITECTURE.md` for the full system design and
`.env.example` for every credential the app needs once connected to live services.

## Status

Build complete end to end: ingest -> detect -> grounded AI explanation -> maker-checker
resolution -> audit report -> executive rollup. See `BACKLOG.md` for the itemized feature
list and `ROADMAP.md` for what comes after v1.
