# LedgerSense: Personas

Five personas anchor LedgerSense's design and go-to-market. They are not hypothetical: they map to the actual roles that touch reconciliation at a growing fintech, startup, or finance org, from the person doing the work to the person who has to sign off on it.

---

## 1. The Finance/Accounting Analyst

**Role/context:** Individual contributor on a finance or accounting team, usually 1-3 years into their career, responsible for the day-to-day reconciliation of bank accounts, payment processor payouts, and internal ledgers. At a startup this might be their whole job; at a larger company it's a recurring weekly or monthly task alongside other close activities.

**Goals:**
- Get through reconciliation for the period without missing something that comes back to bite them later.
- Understand *why* something doesn't match, quickly, without escalating every discrepancy to a manager.
- Have a clean, defensible writeup ready when asked.

**Pain points today:**
- Reconciliation is done in Excel/Google Sheets: export bank CSV, export processor payout CSV, export ledger CSV, then VLOOKUP/manual eyeballing to find what matches and what doesn't.
- Duplicate charges and outliers are easy to miss in a sheet with thousands of rows; there's no systematic way to scan for them beyond sorting and scrolling.
- When something doesn't match, the analyst has to manually dig through both source systems to figure out why, often re-deriving context that existed weeks ago and is now gone.
- No memory across periods: last month's investigation and its resolution isn't linked to this month's version of the same recurring discrepancy.

**What LedgerSense gives them:**
- Upload the same three CSVs they already have; get a normalized ledger and automatic detection instead of manual scanning.
- Every flagged item comes with a plain-language explanation grounded in the actual rows: which transactions, which rule, what it likely means, and a suggested resolution to start from instead of a blank page.
- A running record of past exceptions and how they were resolved, so recurring issues are recognizable instead of rediscovered.

**Representative scenario:** It's the 3rd of the month. Priya needs to close out payout reconciliation before the 5th. She used to spend a full day cross-referencing Stripe payouts against the internal ledger by hand. Now she uploads both files, kicks off a detection run, and in a few minutes has a list of 12 exceptions instead of 4,000 undifferentiated rows: 3 duplicates, 2 outliers, 6 timing gaps that are within the normal settlement window and can be dismissed in bulk, and 1 real mismatch that needs investigation. She reads the AI explanation for the mismatch, agrees with its suggested resolution, and proposes it for approval. Reconciliation goes from a full day to under an hour.

**Quote:** "I don't need the software to just tell me something's wrong. I need it to tell me *which* rows, *why*, and what to actually do about it, because I still have to write that up for my manager."

---

## 2. The Controller/Finance Manager

**Role/context:** Owns the integrity of the numbers for the company (or a business unit). Reviews and signs off on reconciliation work performed by analysts. Answers to the CFO and, eventually, to auditors. Personally on the hook if something material slips through.

**Goals:**
- Confidence that reconciliation is actually being done thoroughly, not just rubber-stamped.
- A clear separation of duties: the person who proposes a resolution should not be the same person who approves it.
- Visibility into what's open, what's overdue, and what's been resolved without having to ask the analyst directly every time.

**Pain points today:**
- In a spreadsheet-based process, "sign-off" is often just a checkmark or a Slack message, not enforced maker-checker with a record.
- No structural way to prevent one person from proposing and approving their own resolution. It relies entirely on trust and manual process discipline.
- When something goes wrong (a discrepancy written off incorrectly, a duplicate paid out twice), reconstructing who decided what and why can take hours of digging through emails and old spreadsheet versions.
- Reviewing an analyst's work means either re-doing it themselves or trusting it blindly.

**What LedgerSense gives them:**
- A maker-checker workflow that's structurally enforced: the system will not let the same person propose and approve a resolution.
- A queue of pending approvals with the AI-grounded explanation attached, so review is about judgment, not re-investigation from scratch.
- A full, timestamped audit trail of every proposal, approval, rejection, and resolution, queryable at any time.

**Representative scenario:** Marcus reviews the approval queue every morning. Instead of getting a Slack message saying "hey, this $1,800 difference is fine, I looked into it," he sees the actual flagged rows, the rule that triggered the flag, the AI's grounded explanation, and the analyst's proposed resolution. He can approve in seconds when it's clearly right, or push back with a rejection reason when it isn't, and that rejection is recorded too. At quarter-end, he can pull the full trail for every resolved exception without reconstructing anything from memory.

**Quote:** "I'm not trying to slow my team down. I need to be able to prove, six months from now, exactly who decided what and why."

---

## 3. FinOps/Payments Ops (fintech or startup)

**Role/context:** Works inside a fintech or startup handling real money movement through a payment processor (Stripe, Adyen, etc.) at meaningful volume. Reconciles processor payouts against internal ledgers and customer-facing balances. Often a hybrid of finance and engineering-adjacent operations, dealing with volume that spreadsheets weren't built for.

**Goals:**
- Catch discrepancies between what the processor says was paid out and what the internal system recorded, before they compound.
- Handle real transaction volume (thousands to tens of thousands of rows per period) without the process breaking down.
- Move fast without sacrificing rigor, since payments issues are often customer-facing and time-sensitive.

**Pain points today:**
- Spreadsheets choke at volume: formulas slow down, manual review becomes impossible past a few thousand rows, and errors creep in from broken references or stale copy-paste.
- Processor payout timing rarely lines up cleanly with internal ledger posting dates, creating a constant stream of "is this a real problem or just a timing artifact" questions.
- No statistical lens on the data: a $50,000 outlier transaction looks the same as a normal one in a flat spreadsheet unless someone happens to notice it.
- Building an internal tool to solve this is a real option considered and usually deprioritized because it's not core product work.

**What LedgerSense gives them:**
- A detection engine built for volume: duplicate detection, statistical outlier detection, mismatch detection, and timing gap detection all run automatically instead of relying on a human noticing patterns in a sheet.
- Timing gap detection specifically distinguishes "this is just normal settlement lag" from "this is actually missing," cutting down false alarms.
- A system that scales with transaction volume without requiring an internal build-vs-buy decision or an enterprise procurement cycle.

**Representative scenario:** Devon's startup processes payments through Stripe and books everything into an internal ledger for merchant payouts. Every week there are a few thousand transactions to reconcile. Before LedgerSense, this meant a shared spreadsheet that three people quietly dreaded touching. Now the reconciliation set runs automatically each week, and Devon's team works from a manageable exception list instead of a raw transaction dump, with statistical outliers and real mismatches surfaced instead of buried in normal timing noise.

**Quote:** "We're not BlackLine's target customer. We're too small for a six-month implementation, but we're too big for a spreadsheet. We need something in between that just works."

---

## 4. The Auditor/Compliance Reviewer

**Role/context:** Either an internal compliance function or an external auditor engaged periodically to review financial controls and reconciliation practices. Cares about process integrity and defensibility, not about doing the reconciliation work itself.

**Goals:**
- Verify that reconciliation is happening on a regular cadence and that exceptions are actually being resolved, not silently ignored.
- Confirm separation of duties is real and enforced, not just claimed in a policy document.
- Get a clean, complete record for any transaction or exception on demand, without needing the finance team to reconstruct it manually.

**Pain points today:**
- Spreadsheet-based reconciliation leaves a fragmented, easily-edited trail. Version history in a shared spreadsheet is not an audit trail.
- "Who approved this and when" is frequently answered with an email search rather than a system record.
- Reviewing maker-checker compliance requires manually cross-referencing who proposed vs who approved each item, which is rarely tracked in a structured, queryable way.
- Sampling transactions for testing means asking the finance team to pull specific records, introducing delay and reliance on the team not to curate what they show.

**What LedgerSense gives them:**
- An immutable, append-only audit log for every exception: when it was flagged, by which rule, what explanation was generated, who proposed a resolution, who approved or rejected it, and when.
- Structural enforcement of maker-checker (the system will not allow the same user to be both), so separation of duties is verifiable rather than asserted.
- Exportable audit records for any reconciliation set or exception, ready for sampling and testing without depending on the finance team to compile it manually.

**Representative scenario:** During a quarterly review, the auditor asks for the full resolution history on a sample of 25 flagged exceptions from the past quarter. Instead of a multi-day back-and-forth pulling records from email and spreadsheet history, the finance team exports the audit trail directly from LedgerSense: full timestamp history, the AI explanation given at the time, the maker's proposal, and the checker's approval, all in one file per exception.

**Quote:** "I don't care how good your detection is if I can't verify who signed off on the outcome. Show me the trail."

---

## 5. The Executive/CFO

**Role/context:** Owns the finance function's overall output and represents financial health to the board, investors, or company leadership. Does not do reconciliation work personally and does not want to look at raw ledgers, but needs to know the function is under control.

**Goals:**
- A quick, trustworthy read on reconciliation health: is the team keeping up, are there systemic issues, is risk exposure growing or shrinking.
- Early warning if reconciliation backlogs are building up, since that's often a leading indicator of bigger financial control problems.
- Confidence to represent the state of the books to the board without needing to caveat it heavily.

**Pain points today:**
- The only visibility into reconciliation health is asking the controller directly, which means status is whatever the controller chooses to summarize, filtered through their own read of severity.
- No consistent, quantified view of match rate, exception volume, or time-to-resolution trends over time.
- Problems tend to surface as fire drills (a discrepancy that's been sitting unresolved for two months suddenly becomes urgent) rather than being visible as a trend earlier.

**What LedgerSense gives them:**
- An executive dashboard showing match rate, open exceptions by severity, average time-to-resolution, and trend over time, without needing to open a single ledger row.
- A consistent, quantified signal of reconciliation health that doesn't depend on any one person's summary.
- Earlier visibility into backlogs building up, since exception aging is tracked and surfaced automatically.

**Representative scenario:** Ahead of a board meeting, the CFO opens the executive dashboard instead of pinging the controller for a status update. Match rate is at 98.7%, open exceptions are trending down week over week, and average time-to-resolution has improved since last quarter. That's the whole update needed for the board deck, backed by a system that can produce the detail if anyone asks a follow-up question.

**Quote:** "I don't need to see the ledger. I need to know, in ten seconds, whether reconciliation is under control or about to become my problem."
