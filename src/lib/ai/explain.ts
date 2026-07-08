import { getGroqClient, GROQ_MODEL } from "./groq";
import type { LedgerRecord } from "@/types/database";

export interface ExplainInput {
  type: string;
  ruleCode: string;
  ruleDescription: string;
  severity: string;
  amount: number | null;
  records: LedgerRecord[];
}

export interface ExplainOutput {
  summary: string;
  groundedRule: string;
  suggestedResolution: string;
}

function recordsAsContext(records: LedgerRecord[]): string {
  return records
    .map((r, i) => {
      const date = r.txn_date ?? r.entry_date ?? "unknown date";
      return `Row ${i + 1}: id=${r.id}, date=${date}, amount=${r.amount} ${r.currency}, counterparty="${
        r.counterparty ?? "none"
      }", reference="${r.external_ref ?? "none"}", description="${r.description ?? "none"}"`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are a reconciliation copilot embedded in LedgerSense, a financial anomaly-detection product.
You explain exceptions ONLY using the rule and rows given to you in the user message. Never invent
amounts, dates, counterparties, or reasons that are not present in the provided data. If the data is
insufficient to be certain, say so plainly rather than guessing.

Respond with strict JSON only, matching this shape:
{"summary": string, "groundedRule": string, "suggestedResolution": string}

- "summary": 2-3 plain-language sentences explaining why this was flagged, citing the specific rows
  (by date/amount/counterparty, not row numbers) and the rule that triggered.
- "groundedRule": one sentence restating the rule and threshold that caused the flag.
- "suggestedResolution": one concrete, actionable next step (e.g. "void the duplicate entry dated
  2026-01-06", "escalate: no counterpart found within the match window", "confirm the $37.42
  difference with the counterparty before writing off").`;

/**
 * Grounded explanation: the prompt hands the model only the exception's rule
 * and its exact flagged rows, and the system prompt forbids inventing
 * anything outside that data. This is the "blue = you can trace it" promise
 * from the design system; nothing here should read as generic LLM filler.
 */
export async function generateExplanation(input: ExplainInput): Promise<ExplainOutput> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured. Add it to .env.local to enable AI explanations.");
  }

  const userPrompt = `Exception type: ${input.type}
Severity: ${input.severity}
Rule code: ${input.ruleCode}
Rule description: ${input.ruleDescription}
Flagged amount: ${input.amount ?? "n/a"}

Flagged rows:
${recordsAsContext(input.records)}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<ExplainOutput>;

  return {
    summary: parsed.summary ?? "The model did not return a summary.",
    groundedRule: parsed.groundedRule ?? input.ruleDescription,
    suggestedResolution: parsed.suggestedResolution ?? "Review manually.",
  };
}
