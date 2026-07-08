# LedgerSense: Product Requirements Document (v1)

**Owner:** Parva Barot
**Status:** MVP built, pre-launch
**Last updated:** 2026-07-07

## 1. Problem Statement

Every finance team that touches money movement (bank feeds, payment processor payouts, internal ledgers) eventually hits the same wall: reconciliation. Transactions from different systems need to be matched against each other, and the ones that don't match need to be investigated, explained, and resolved.

Today this mostly happens in spreadsheets. An analyst pulls a CSV from Stripe or the bank, pulls another CSV from the internal ledger, and manually eyeballs or VLOOKUPs rows against each other. This breaks down in three specific ways:

1. **Detection is manual and error-prone.** Duplicate charges, statistical outliers, timing gaps between when a processor pays out and when the ledger books it, and outright mismatches all require different mental models to spot. A human scanning rows will miss the subtle ones, especially at volume.
2. **Even when something is flagged, nobody knows why it matters or what to do about it.** A raw list of "these 40 rows don't match" is not an answer. Someone still has to figure out root cause and write it up, often days later, when context is gone.
3. **There's no defensible trail.** When an auditor or a controller asks "who approved writing off this $4,200 discrepancy, and why," the answer is often a Slack message or nothing at all. Spreadsheets don't enforce separation of duties and don't leave a record.

Existing software either solves detection without explanation (rules engines, plain matching tools) or solves it as part of an expensive, heavyweight close-management suite that takes months to roll out and is priced for enterprises with dedicated implementation budgets. Nothing serves the mid-market and startup finance team that wants real reconciliation rigor without a six-figure contract.

## 2. Goals

- Let a finance/ops user ingest transaction and ledger data (bank feed, processor payout, internal ledger) with minimal setup and get a normalized, queryable ledger model.
- Automatically detect the four reconciliation problems that account for the overwhelming majority of manual review time: duplicates, statistical outliers, reconciliation mismatches, and timing gaps.
- Attach a grounded, LLM-generated explanation to every flagged item: what was flagged, which rule triggered it, which actual rows are involved, and a suggested resolution, not a generic summary.
- Enforce maker-checker on every resolution so nothing is marked resolved without a second, distinct approver.
- Keep a complete, exportable audit trail of every detection, explanation, and approval decision.
- Give an executive/controller a health view of reconciliation status without needing to read raw ledger rows.
- Run the entire product on free-tier infrastructure so the cost of operating it is zero until usage genuinely outgrows the free tier.

## 3. Non-Goals (for v1)

- Full close-management (journal entries, close checklists, flux analysis, multi-entity consolidation). LedgerSense is a reconciliation and detection layer, not a close suite.
- Being a general-purpose ETL or data warehouse. Ingestion is scoped to transaction/ledger reconciliation, not arbitrary data pipelines.
- Direct bank/processor API connectors (Plaid, Stripe API pulls, etc.): v1 is CSV/file upload only. Live connectors are a v1.x/V1 roadmap item, not MVP.
- Multi-currency support. All amounts are assumed single-currency per tenant in the MVP.
- Custom, user-authored detection rules. The four built-in rule types are fixed in the MVP; a rule builder is a V2 idea.
- Real-time streaming ingestion. Detection runs are batch/async, triggered by upload or schedule, not live per-transaction.

## 4. Personas (summary, see PERSONAS.md for full detail)

| Persona | Primary need |
|---|---|
| Finance/Accounting Analyst | Find and explain reconciliation breaks fast |
| Controller/Finance Manager | Maker-checker trail and confidence in the numbers |
| FinOps/Payments Ops (fintech/startup) | Reconcile processor payouts vs internal records at scale |
| Auditor/Compliance | Defensible record of every flag, explanation, and decision |
| Executive/CFO | Health view of reconciliation status, not raw ledgers |

## 5. Functional Requirements

Organized around the three product pillars.

### Pillar 1: Ingestion & Ledger Model

- **FR1.1** Users can create a tenant/organization workspace; all data is scoped to that tenant (multi-tenant from day one).
- **FR1.2** Users can upload transaction data via CSV for three source types: bank feed, processor payout, internal ledger.
- **FR1.3** The system normalizes uploaded rows into a common internal ledger model (date, amount, currency, counterparty, external reference ID, source system, raw payload) regardless of the source CSV's original column layout.
- **FR1.4** Users can map CSV columns to the internal model at upload time (column mapping step) to tolerate varying export formats from different banks/processors.
- **FR1.5** Uploaded data is grouped into a "reconciliation set": a defined pairing of two or more sources (e.g., Stripe payouts vs internal ledger) covering a specific date range.
- **FR1.6** The system stores raw uploaded files and normalized rows separately, so the original source data is always retrievable.
- **FR1.7** Duplicate file uploads (same file re-uploaded) are detected and flagged before processing.

### Pillar 2: Detection & Reconciliation Engine

- **FR2.1** The system runs four detection rule types against a reconciliation set:
  - **Duplicate detection**: transactions that match on amount, counterparty, and a tight date window, indicating a probable double-charge or double-booking.
  - **Statistical outlier detection**: transactions whose amount deviates significantly from the historical distribution for that counterparty/category, using standard statistical methods (z-score/IQR-based).
  - **Reconciliation mismatch detection**: transactions present in one source but not matched in the other within the reconciliation set (one-sided entries), or matched entries with a value mismatch.
  - **Timing gap detection**: transactions that match in substance but book on different dates across sources beyond an expected settlement window (e.g., payout date vs ledger post date).
- **FR2.2** Detection runs execute asynchronously as background jobs so large reconciliation sets don't block the UI.
- **FR2.3** Each detection run produces a set of "exceptions" (flagged items), each tagged with the rule that triggered it, the specific rows involved, and a computed confidence/severity score.
- **FR2.4** Users can trigger a detection run manually on demand for a reconciliation set.
- **FR2.5** Detection thresholds (e.g., outlier sensitivity, timing gap window) are configurable per tenant, with sensible defaults out of the box.
- **FR2.6** Exceptions are deduplicated across repeated runs so re-running detection doesn't create duplicate open exceptions for the same underlying issue.

### Pillar 3: AI Explanation + Maker-Checker Governance

- **FR3.1** Every exception gets an AI-generated explanation that references the actual flagged rows and the specific rule/threshold that triggered the flag (grounded generation, not a generic summary).
- **FR3.2** The explanation includes a suggested resolution (e.g., "write off as duplicate," "manual match to row X," "escalate, no counterpart found").
- **FR3.3** A "maker" (any authorized user) can propose a resolution for an exception, either accepting the AI suggestion or entering their own.
- **FR3.4** A "checker" (a distinct user from the maker, with checker permissions) must approve or reject the proposed resolution before it is considered resolved. The system enforces that maker and checker cannot be the same person.
- **FR3.5** Rejected resolutions return to open status with the checker's rejection reason recorded, and can be re-proposed.
- **FR3.6** Every state transition (flagged → proposed → approved/rejected → resolved) is written to an immutable audit log with timestamp, actor, and reason.
- **FR3.7** The audit trail for any exception or reconciliation set can be exported (e.g., CSV/PDF) for auditor/compliance review.
- **FR3.8** An executive dashboard shows aggregate reconciliation health: match rate, open exceptions by severity, average time-to-resolution, and trend over time, without requiring the viewer to open individual ledger rows.

## 6. Non-Functional Requirements

- **NFR1: Multi-tenancy & data isolation**: All data is isolated per tenant using Postgres Row-Level Security (RLS) in Supabase. No cross-tenant data access is possible at the query layer, not just the application layer.
- **NFR2: Audit trail integrity**: Audit log entries are append-only. No UI path exists to edit or delete a historical audit record.
- **NFR3: Rate limiting**: API routes that trigger detection runs or LLM calls are rate-limited per tenant (via Upstash Redis/Ratelimit) to control cost and prevent abuse, since the product runs on free-tier infrastructure with real usage ceilings.
- **NFR4: Zero-cost operating constraint**: The system must run entirely within the free tiers of its infrastructure providers (Vercel, Supabase, Upstash, Groq) at MVP usage levels. Any feature that would require paid infrastructure at launch is deferred.
- **NFR5: Explainability grounding**: The AI explanation layer must only reference data actually present in the flagged rows and the rule that triggered the flag. It must not fabricate transaction details. Prompts are constructed to inject the actual row data and rule definition, not left to open-ended generation.
- **NFR6: Auditability of AI output**: The exact prompt and model response used to generate an explanation are stored alongside the exception, so an auditor can see precisely what the system was told and what it returned.
- **NFR7: Async processing**: Detection runs and LLM explanation calls run as background jobs (Upstash QStash) so the UI remains responsive regardless of reconciliation set size.
- **NFR8: Reasonable latency**: A detection run on a typical reconciliation set (under 10,000 rows per side) completes and surfaces exceptions within a few minutes of being triggered.

## 7. Success Metrics

See KPI_FRAMEWORK.md and NORTH_STAR_METRIC.md for full detail. Headline metrics for v1:

- Time to first completed reconciliation run after signup (activation).
- Number of exceptions detected and given a grounded explanation per active reconciliation set per week.
- Percentage of exceptions that reach full maker-checker resolution (not just detected, actually closed with a second signature).
- Percentage of AI explanations accepted by the maker without material edit (a proxy for explanation quality/trust).
- Weekly active reconciliation sets per tenant (engagement/retention signal).

## 8. Out of Scope for v1

- Live bank/processor API connectors (Plaid, direct Stripe API).
- Multi-currency and FX handling.
- Custom/user-defined detection rules beyond the four built-in types.
- Scheduled/recurring automatic reconciliation runs (v1 is manual-trigger only).
- Slack/email notifications.
- ERP integrations (NetSuite, QuickBooks, Xero) beyond CSV export/import.
- Predictive/forecasting features (anomaly trend forecasting).
- Role-based permission granularity beyond maker/checker/admin (e.g., no per-reconciliation-set ACLs in v1).
- Mobile app or mobile-optimized UI.
