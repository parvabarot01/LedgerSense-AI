"use server";

import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { rateLimit } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { fetchRecordsByIds } from "@/lib/detection/enrich";
import { generateExplanation } from "@/lib/ai/explain";
import { answerQuestion } from "@/lib/ai/query";
import { groqConfigured } from "@/lib/ai/groq";
import { explainExceptionSchema, naturalLanguageQuerySchema } from "@/lib/validation/schemas";
import type { Explanation } from "@/types/database";

export interface ExplainState {
  error?: string;
  explanation?: Explanation;
}

export async function requestExplanation(orgId: string, exceptionId: string): Promise<ExplainState> {
  const parsed = explainExceptionSchema.safeParse({ orgId, exceptionId });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!groqConfigured) {
    return { error: "AI explanations aren't enabled yet. Set GROQ_API_KEY once you've connected Groq." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getMembership(supabase, user.id, orgId);
  if (!hasRole(role, ["owner", "admin", "analyst", "checker"])) {
    return { error: "You don't have permission to request an explanation." };
  }

  const limit = await rateLimit.ai(`${orgId}:${user.id}`);
  if (!limit.success) return { error: "Too many AI requests. Try again in a minute." };

  const { data: exception, error: exceptionError } = await supabase
    .from("exceptions")
    .select("*")
    .eq("id", exceptionId)
    .eq("org_id", orgId)
    .single();
  if (exceptionError || !exception) return { error: "Exception not found." };

  const transactionIds = exception.record_refs.filter((r) => r.table === "transaction").map((r) => r.id);
  const ledgerIds = exception.record_refs.filter((r) => r.table === "ledger_entry").map((r) => r.id);
  const [transactionRecords, ledgerRecords] = await Promise.all([
    fetchRecordsByIds(supabase, "transactions", transactionIds),
    fetchRecordsByIds(supabase, "ledger_entries", ledgerIds),
  ]);
  const records = [...transactionRecords.values(), ...ledgerRecords.values()];

  try {
    const result = await generateExplanation({
      type: exception.type,
      ruleCode: exception.rule_code,
      ruleDescription: exception.rule_description,
      severity: exception.severity,
      amount: exception.amount,
      records,
    });

    const { data: explanation, error: insertError } = await supabase
      .from("explanations")
      .insert({
        org_id: orgId,
        exception_id: exceptionId,
        summary: result.summary,
        grounded_rule: result.groundedRule,
        suggested_resolution: result.suggestedResolution,
        model: "llama-3.3-70b-versatile",
      })
      .select()
      .single();
    if (insertError || !explanation) return { error: insertError?.message ?? "Could not save explanation." };

    await recordAudit(supabase, {
      orgId,
      actorId: user.id,
      action: "exception.explained",
      entityType: "exception",
      entityId: exceptionId,
      after: { explanationId: explanation.id },
    });

    return { explanation };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate an explanation." };
  }
}

export interface QueryState {
  error?: string;
  answer?: string;
}

export async function runNaturalLanguageQuery(
  orgId: string,
  reconciliationSetId: string,
  question: string
): Promise<QueryState> {
  const parsed = naturalLanguageQuerySchema.safeParse({ orgId, reconciliationSetId, question });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!groqConfigured) {
    return { error: "Natural-language query isn't enabled yet. Set GROQ_API_KEY once you've connected Groq." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getMembership(supabase, user.id, orgId);
  if (!hasRole(role, ["owner", "admin", "analyst", "checker", "auditor"])) {
    return { error: "You don't have permission to query this workspace." };
  }

  const limit = await rateLimit.ai(`${orgId}:${user.id}`);
  if (!limit.success) return { error: "Too many AI requests. Try again in a minute." };

  const { data: reconSet, error: reconError } = await supabase
    .from("reconciliation_sets")
    .select("*")
    .eq("id", reconciliationSetId)
    .eq("org_id", orgId)
    .single();
  if (reconError || !reconSet) return { error: "Reconciliation set not found." };

  const [{ data: sourceA }, { data: sourceB }] = await Promise.all([
    supabase.from("data_sources").select("*").eq("id", reconSet.source_a_id).single(),
    supabase.from("data_sources").select("*").eq("id", reconSet.source_b_id).single(),
  ]);
  if (!sourceA || !sourceB) return { error: "Data sources not found." };

  const tableA = sourceA.kind === "ledger" ? "ledger_entries" : "transactions";
  const tableB = sourceB.kind === "ledger" ? "ledger_entries" : "transactions";

  const [{ data: rowsA }, { data: rowsB }, { data: exceptions }] = await Promise.all([
    supabase.from(tableA).select("*").eq("data_source_id", sourceA.id).limit(300),
    supabase.from(tableB).select("*").eq("data_source_id", sourceB.id).limit(300),
    supabase.from("exceptions").select("*").eq("reconciliation_set_id", reconciliationSetId).limit(300),
  ]);

  try {
    const answer = await answerQuestion(question, {
      sourceAName: sourceA.name,
      sourceBName: sourceB.name,
      transactions: tableA === "transactions" ? rowsA ?? [] : rowsB ?? [],
      ledgerEntries: tableA === "ledger_entries" ? rowsA ?? [] : rowsB ?? [],
      exceptions: exceptions ?? [],
    });

    await recordAudit(supabase, {
      orgId,
      actorId: user.id,
      action: "reconciliation_set.queried",
      entityType: "reconciliation_set",
      entityId: reconciliationSetId,
      after: { question },
    });

    return { answer };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not answer the question." };
  }
}
