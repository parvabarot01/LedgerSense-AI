import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DataSource, RecordKind } from "@/types/database";
import { runDetection } from "./runDetection";
import type { DetectionRecord } from "./types";
import { recordAudit } from "@/lib/audit";

function recordKindOf(dataSourceKind: DataSource["kind"]): RecordKind {
  return dataSourceKind === "ledger" ? "ledger_entry" : "transaction";
}

async function fetchRecords(
  supabase: SupabaseClient<Database>,
  source: DataSource
): Promise<DetectionRecord[]> {
  const table = source.kind === "ledger" ? "ledger_entries" : "transactions";
  const dateColumn = source.kind === "ledger" ? "entry_date" : "txn_date";

  const { data, error } = await supabase.from(table).select("*").eq("data_source_id", source.id);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    date: (row as unknown as Record<string, string>)[dateColumn],
    amount: row.amount,
    counterparty: row.counterparty,
    reference: row.external_ref,
    description: row.description,
  }));
}

export interface ExecuteDetectionRunParams {
  orgId: string;
  reconciliationSetId: string;
  detectionRunId: string;
  triggeredBy: string | null;
}

/**
 * The actual detection work, shared by the synchronous dev-mode path (called
 * directly from the trigger action when QStash isn't configured) and the
 * QStash callback route (the production async path for larger datasets).
 * Takes a Supabase client rather than constructing one so callers control
 * whether it runs with the user's session (sync path, RLS applies) or a
 * service-role client (async webhook path, no user session to scope to).
 */
export async function executeDetectionRun(
  supabase: SupabaseClient<Database>,
  params: ExecuteDetectionRunParams
): Promise<void> {
  const { orgId, reconciliationSetId, detectionRunId, triggeredBy } = params;

  try {
    await supabase
      .from("detection_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", detectionRunId);

    const { data: reconSet, error: reconError } = await supabase
      .from("reconciliation_sets")
      .select("*")
      .eq("id", reconciliationSetId)
      .single();
    if (reconError || !reconSet) throw reconError ?? new Error("Reconciliation set not found");

    const { data: sourceA, error: sourceAError } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", reconSet.source_a_id)
      .single();
    if (sourceAError || !sourceA) throw sourceAError ?? new Error("Source A not found");

    const { data: sourceB, error: sourceBError } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", reconSet.source_b_id)
      .single();
    if (sourceBError || !sourceB) throw sourceBError ?? new Error("Source B not found");

    const [recordsA, recordsB] = await Promise.all([
      fetchRecords(supabase, sourceA),
      fetchRecords(supabase, sourceB),
    ]);

    const result = runDetection(recordsA, recordsB, {
      windowDays: reconSet.match_window_days,
      amountTolerance: reconSet.amount_tolerance,
    });

    if (result.matches.length > 0) {
      const { error } = await supabase.from("matches").insert(
        result.matches.map((m) => ({
          org_id: orgId,
          reconciliation_set_id: reconciliationSetId,
          detection_run_id: detectionRunId,
          source_a_record_id: m.aId,
          source_b_record_id: m.bId,
          match_type: m.matchType,
          status: m.status,
          amount_delta: m.amountDelta,
          date_delta_days: m.dateDeltaDays,
        }))
      );
      if (error) throw error;
    }

    if (result.exceptions.length > 0) {
      const kindA = recordKindOf(sourceA.kind);
      const kindB = recordKindOf(sourceB.kind);
      const recordsById = new Map([...recordsA, ...recordsB].map((r) => [r.id, r]));
      const now = new Date();

      const { error } = await supabase.from("exceptions").insert(
        result.exceptions.map((e) => {
          const oldestDate = e.recordRefs
            .map((r) => recordsById.get(r.id)?.date)
            .filter((d): d is string => Boolean(d))
            .sort()[0];
          const ageDays = oldestDate
            ? Math.max(0, Math.round((now.getTime() - new Date(oldestDate).getTime()) / 86400000))
            : 0;

          return {
            org_id: orgId,
            reconciliation_set_id: reconciliationSetId,
            detection_run_id: detectionRunId,
            type: e.type,
            severity: e.severity,
            rule_code: e.ruleCode,
            rule_description: e.ruleDescription,
            amount: e.amount,
            age_days: ageDays,
            record_refs: e.recordRefs.map((r) => ({ table: r.side === "a" ? kindA : kindB, id: r.id })),
          };
        })
      );
      if (error) throw error;
    }

    await supabase
      .from("detection_runs")
      .update({
        status: "completed",
        total_a: result.summary.totalA,
        total_b: result.summary.totalB,
        matched_count: result.summary.matchedCount,
        exception_count: result.summary.exceptionCount,
        match_rate: result.summary.matchRate,
        completed_at: new Date().toISOString(),
      })
      .eq("id", detectionRunId);

    await recordAudit(supabase, {
      orgId,
      actorId: triggeredBy,
      action: "detection_run.completed",
      entityType: "detection_run",
      entityId: detectionRunId,
      after: {
        matchRate: result.summary.matchRate,
        exceptionCount: result.summary.exceptionCount,
        matchedCount: result.summary.matchedCount,
      },
    });
  } catch (error) {
    await supabase
      .from("detection_runs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", detectionRunId);
    throw error;
  }
}
