# LedgerSense: Roadmap

**Last updated:** 2026-07-07

This roadmap reflects three horizons: what's built and shipped today (MVP), what comes next once early users are on the product (V1), and where the product goes once the core loop is validated (V2). It is intentionally concrete rather than aspirational; each item ties back to a specific gap observed or anticipated in the current build.

---

## MVP: Built Now

All three build sprints are complete: ingestion & ledger model, detection & reconciliation engine, and AI explanation + maker-checker + executive dashboard.

### Sprint 1: Multi-tenant ingestion & ledger model
- Tenant/organization workspace with Supabase Auth and Postgres RLS enforcing data isolation per tenant.
- CSV upload for three source types: bank feed, processor payout, internal ledger.
- Column mapping UI so varying bank/processor export formats normalize into a single internal ledger model.
- Reconciliation sets: a defined pairing of sources over a date range, the unit of work for detection.
- Raw file storage separate from normalized rows, so original source data is always retrievable.
- Duplicate-upload detection at the file level.

### Sprint 2: Detection & reconciliation engine
- Four detection rule types running as async background jobs (Upstash QStash):
  - Duplicate detection (amount + counterparty + tight date window).
  - Statistical outlier detection (z-score/IQR-based, using simple-statistics against historical distribution per counterparty/category).
  - Reconciliation mismatch detection (one-sided entries, value mismatches between matched entries).
  - Timing gap detection (matched in substance, booked outside expected settlement window across sources).
- Configurable detection thresholds per tenant with sensible defaults.
- Exception deduplication across repeated runs.
- Manual on-demand detection run trigger.

### Sprint 3: AI explanation + maker-checker + executive dashboard
- Groq/Llama 3.3 70B-backed explanation generation for every exception, grounded in the actual flagged rows and the specific rule/threshold triggered, with a suggested resolution.
- Maker-checker workflow: propose a resolution, structurally distinct approver required, rejection with reason and re-proposal loop.
- Immutable, append-only audit log across every state transition (flagged → proposed → approved/rejected → resolved).
- Audit trail export per exception/reconciliation set.
- Executive dashboard: match rate, open exceptions by severity, average time-to-resolution, trend over time.
- Rate limiting on detection and LLM-triggering routes (Upstash Ratelimit) to operate safely within free-tier ceilings.

---

## V1: Next

Focused on removing the friction points that will surface once real teams use the MVP for a full reconciliation cycle, not just a demo.

- **Direct bank/processor API connectors.** Move beyond CSV-only for the highest-friction sources: a Stripe payout API pull and at minimum one bank aggregator (Plaid) integration, so recurring reconciliation doesn't require a manual export step every period.
- **Scheduled/recurring reconciliation runs.** Let a reconciliation set run automatically on a cadence (daily/weekly/monthly) instead of requiring a manual trigger every time, with results waiting when the analyst logs in.
- **Slack and email notifications.** Notify makers when new exceptions are detected, notify checkers when a resolution is awaiting approval, and notify controllers when exceptions age past a threshold without action.
- **Additional detection rule types**, based on what the four built-in rules miss in practice: partial-match detection (a payout split across multiple ledger entries or vice versa), fee/adjustment detection (processor fees or FX adjustments that look like mismatches but are expected deductions), and recurring-exception recognition (flag when this month's exception matches a pattern already resolved in a prior period, so it can be fast-tracked).
- **Bulk actions on exceptions.** Approve/dismiss low-severity, high-confidence exceptions (e.g., known timing gaps within tolerance) in bulk rather than one at a time, reducing the reviewer workload that scales with transaction volume.
- **Per-reconciliation-set access control.** More granular permissions so a FinOps team lead can restrict which reconciliation sets an analyst can see or act on, beyond the flat maker/checker/admin roles in the MVP.
- **Improved column mapping memory.** Remember and reuse column mappings per source template so recurring uploads from the same bank/processor format don't require re-mapping every time.

---

## V2: Later

Bigger bets that depend on having real usage data and a validated core loop first.

- **Predictive/anomaly-trend forecasting.** Use historical exception data per tenant to forecast likely problem areas before the next reconciliation run (e.g., "this counterparty has had a timing gap exception 3 months running, expect a 4th"), turning the product from reactive detection into proactive risk flagging.
- **Custom rule builder for finance teams.** Let finance teams define their own detection rules (thresholds, conditions, counterparty-specific logic) beyond the four fixed types, for teams whose reconciliation problems don't fit the built-in patterns.
- **Multi-currency support.** Handle FX conversion, cross-currency matching, and currency-aware statistical baselines, needed for any tenant operating across multiple countries or currencies.
- **ERP integrations.** Direct integrations with NetSuite, QuickBooks, and Xero so the internal ledger side of reconciliation doesn't require a manual export either, closing the loop that V1's connectors start on the bank/processor side.
- **Multi-entity consolidation view.** For companies with multiple legal entities or subsidiaries, a rolled-up reconciliation health view across entities, feeding into the executive dashboard.
- **Team-level benchmarking (opt-in, anonymized).** Let a tenant see how its match rate and time-to-resolution compare to anonymized peer benchmarks, a natural output of having enough tenant data to be meaningful.
- **API access for programmatic integration.** Let more sophisticated FinOps teams push transaction data and pull exception data programmatically rather than exclusively through the UI, for teams that want to embed LedgerSense into a broader internal tooling stack.

---

## Explicitly Not Planned

To keep scope honest: LedgerSense does not intend to become a full close-management suite (journal entries, close checklists, flux analysis) or a general-purpose data platform. Anything in that direction is a deliberate non-goal, not a "maybe later" (see COMPETITIVE_ANALYSIS.md for the reasoning).
