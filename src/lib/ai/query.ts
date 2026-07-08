import { getGroqClient, GROQ_MODEL } from "./groq";
import type { ExceptionRow, LedgerRecord } from "@/types/database";

const MAX_CONTEXT_ROWS = 300;

export interface QueryContext {
  sourceAName: string;
  sourceBName: string;
  transactions: LedgerRecord[];
  ledgerEntries: LedgerRecord[];
  exceptions: ExceptionRow[];
}

function recordLine(prefix: string, r: LedgerRecord): string {
  const date = r.txn_date ?? r.entry_date ?? "unknown date";
  return `${prefix} id=${r.id} date=${date} amount=${r.amount} ${r.currency} counterparty="${
    r.counterparty ?? "none"
  }" ref="${r.external_ref ?? "none"}"`;
}

function exceptionLine(e: ExceptionRow): string {
  return `exception id=${e.id} type=${e.type} severity=${e.severity} status=${e.status} amount=${
    e.amount ?? "n/a"
  } age_days=${e.age_days} rule="${e.rule_description}"`;
}

const SYSTEM_PROMPT = `You are a reconciliation copilot embedded in LedgerSense. Answer the user's question using
ONLY the data rows provided below. Cite specific rows (date, amount, counterparty) in your answer.
If the data provided does not contain enough information to answer confidently, say so explicitly
instead of guessing. Keep the answer concise (a short paragraph or a short list), in plain text.`;

/**
 * Bounded-context grounding: the demo/free-tier scale here (hundreds of rows
 * per reconciliation set) fits comfortably within a single prompt, so the
 * whole scoped dataset is handed to the model rather than building a
 * separate NL-to-SQL layer. MAX_CONTEXT_ROWS caps it defensively; past that,
 * this approach would need real function-calling against the database
 * instead of a context dump (noted as a scaling ceiling in ARCHITECTURE.md).
 */
export async function answerQuestion(question: string, context: QueryContext): Promise<string> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured. Add it to .env.local to enable natural-language query.");
  }

  const lines = [
    ...context.transactions.slice(0, MAX_CONTEXT_ROWS).map((r) => recordLine(`${context.sourceAName} row:`, r)),
    ...context.ledgerEntries.slice(0, MAX_CONTEXT_ROWS).map((r) => recordLine(`${context.sourceBName} row:`, r)),
    ...context.exceptions.slice(0, MAX_CONTEXT_ROWS).map(exceptionLine),
  ];

  const userPrompt = `Question: ${question}\n\nData:\n${lines.join("\n")}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? "No answer was returned.";
}
