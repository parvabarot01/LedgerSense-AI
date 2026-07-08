# LedgerSense: Executive Summary

**Founder:** Parva Barot
**Date:** 2026-07-07
**Status:** Pre-launch, build complete, seeking design partners

## What It Is

LedgerSense is an AI-powered financial anomaly-detection and reconciliation copilot for finance and accounting teams. It ingests transaction and ledger data (bank feeds, payment processor payouts, internal ledgers), automatically detects the reconciliation problems that eat the most manual review time (duplicates, statistical outliers, mismatches, timing gaps), and uses an LLM to explain, in plain language grounded in the actual flagged rows and the specific rule that triggered the flag, why each item was flagged and what to do about it. Every resolution goes through a maker-checker approval workflow, a maker proposes, a distinct checker approves or rejects, with a full audit trail, so nothing is considered resolved without a second signature and a defensible record.

## The Problem

Reconciliation at most startups and smaller finance teams still happens in spreadsheets: export a CSV from the bank or processor, export another from the internal ledger, manually cross-reference. This breaks down in three specific ways: detection is manual and misses subtle issues at volume, flagged discrepancies come with no explanation of root cause or next step, and there's no real audit trail of who approved what and why. Existing software solves one piece or the other, plain matching tools detect without explaining, and enterprise close-management suites (BlackLine, FloQast) bundle governance into a multi-month implementation priced for large enterprises. Nothing serves the team that has outgrown spreadsheets but is nowhere near ready for a six-figure enterprise contract.

## Why Now

Two things make this the right moment. First, capable, affordable LLMs (Groq running Llama 3.3 70B) make grounded, row-level explanation genuinely achievable without enterprise AI infrastructure spend, this simply wasn't cheaply buildable a couple of years ago. Second, the modern free-tier cloud stack (Vercel, Supabase, Upstash) has matured enough that a real, multi-tenant, production-grade product can run at zero infrastructure cost until usage genuinely demands otherwise, which means LedgerSense can be free to a real degree for the exact segment (early-stage fintech and startup finance teams) that most needs a low-friction, low-cost solution.

## Product Overview

LedgerSense is built around three pillars:

1. **Ingestion & ledger model**: multi-tenant workspaces (Postgres Row-Level Security per tenant), CSV upload for bank feeds, processor payouts, and internal ledgers, with column mapping to normalize varying export formats into one internal ledger model, organized into reconciliation sets.
2. **Detection & reconciliation engine**: four statistical detection rule types (duplicates, outliers, mismatches, timing gaps) running as async background jobs, producing a deduplicated, severity-scored list of exceptions per reconciliation set.
3. **AI explanation + maker-checker governance**: every exception gets a grounded, LLM-generated explanation and suggested resolution; every resolution requires a distinct maker and checker; every state transition is logged to an immutable audit trail, exportable for auditor/compliance review; an executive dashboard rolls all of this up into a health view (match rate, open exceptions, time-to-resolution) for anyone who needs the status without reading raw ledger rows.

## Current State

All three build sprints are complete. The product runs end-to-end today: a tenant can sign up, upload transaction data, run detection, receive grounded AI explanations for flagged exceptions, work them through maker-checker approval, and view aggregate health on the executive dashboard, all on free-tier infrastructure (Next.js on Vercel, Supabase, Upstash, Groq).

## Traction and Next Steps

LedgerSense is pre-launch. There is no live customer base yet, this is a deliberate sequencing choice: the priority right now is validating the core loop (detection through grounded explanation through governed resolution) with a small number of real design partners before any broad public launch. See GTM_STRATEGY.md for the phased plan: private beta with 5-10 design partner teams first, then a public launch (Product Hunt, Indie Hackers, targeted finance/fintech communities), then expansion once activation and retention signals are healthy.

## The Ask

Seeking 5-10 design partner teams, specifically seed to Series B fintech/startup finance or FinOps functions currently reconciling processor payouts or bank feeds against internal ledgers manually, to run LedgerSense against real reconciliation data, provide direct feedback, and help validate that the detection and explanation quality holds up outside of test data. No cost to participate; the ask is time and honest feedback in exchange for early, direct access and influence over what gets built next.
