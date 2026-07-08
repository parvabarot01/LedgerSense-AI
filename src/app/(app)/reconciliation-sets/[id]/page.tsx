import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { fetchRecordsByIds } from "@/lib/detection/enrich";
import { SplitView } from "@/components/ledger/SplitView";
import { RunDetectionButton } from "@/components/reconciliation/RunDetectionButton";
import { StatusChip } from "@/components/ledger/StatusChip";
import { QueryBox } from "@/components/ai/QueryBox";
import type { LedgerRecord, MatchStatus } from "@/types/database";

interface PairRow {
  status: MatchStatus;
  a: LedgerRecord;
  b: LedgerRecord;
}

const DISPLAY_LIMIT = 150;

export default async function ReconciliationSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: reconSet } = await supabase
    .from("reconciliation_sets")
    .select("*")
    .eq("id", id)
    .eq("org_id", membership.organization.id)
    .single();
  if (!reconSet) notFound();

  const [{ data: sourceA }, { data: sourceB }] = await Promise.all([
    supabase.from("data_sources").select("*").eq("id", reconSet.source_a_id).single(),
    supabase.from("data_sources").select("*").eq("id", reconSet.source_b_id).single(),
  ]);
  if (!sourceA || !sourceB) notFound();

  const { data: latestRun } = await supabase
    .from("detection_runs")
    .select("*")
    .eq("reconciliation_set_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tableA = sourceA.kind === "ledger" ? "ledger_entries" : "transactions";
  const tableB = sourceB.kind === "ledger" ? "ledger_entries" : "transactions";

  let pairs: PairRow[] = [];
  let unmatchedARows: LedgerRecord[] = [];
  let unmatchedBRows: LedgerRecord[] = [];

  if (latestRun && latestRun.status === "completed") {
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("detection_run_id", latestRun.id)
      .limit(DISPLAY_LIMIT);

    const aIds = (matches ?? []).map((m) => m.source_a_record_id);
    const bIds = (matches ?? []).map((m) => m.source_b_record_id);

    const [recordsA, recordsB] = await Promise.all([
      fetchRecordsByIds(supabase, tableA, aIds),
      fetchRecordsByIds(supabase, tableB, bIds),
    ]);

    pairs = (matches ?? [])
      .map((m): PairRow | null => {
        const a = recordsA.get(m.source_a_record_id);
        const b = recordsB.get(m.source_b_record_id);
        if (!a || !b) return null;
        return { status: m.status, a, b };
      })
      .filter((p): p is PairRow => p !== null);

    const { data: allA } = await supabase.from(tableA).select("id").eq("data_source_id", sourceA.id);
    const { data: allB } = await supabase.from(tableB).select("id").eq("data_source_id", sourceB.id);
    const matchedAIds = new Set(aIds);
    const matchedBIds = new Set(bIds);
    const unmatchedAIds = (allA ?? []).map((r) => r.id).filter((rid) => !matchedAIds.has(rid)).slice(0, 50);
    const unmatchedBIds = (allB ?? []).map((r) => r.id).filter((rid) => !matchedBIds.has(rid)).slice(0, 50);

    const [unmatchedAMap, unmatchedBMap] = await Promise.all([
      fetchRecordsByIds(supabase, tableA, unmatchedAIds),
      fetchRecordsByIds(supabase, tableB, unmatchedBIds),
    ]);
    unmatchedARows = Array.from(unmatchedAMap.values());
    unmatchedBRows = Array.from(unmatchedBMap.values());
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-navy">{reconSet.name}</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">
            {sourceA.name} vs. {sourceB.name} &middot; {reconSet.match_window_days}-day window
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/reconciliation-sets/${id}/exceptions`} className="text-sm text-trace hover:underline">
            View exceptions
          </Link>
          <RunDetectionButton orgId={membership.organization.id} reconciliationSetId={id} />
        </div>
      </div>

      {latestRun && (
        <div className="mt-6 flex items-center gap-6 rounded-sm border border-hairline bg-paper-raised px-5 py-3 text-sm">
          {latestRun.status === "completed" ? (
            <StatusChip status="matched" />
          ) : (
            <span className="text-ink-navy-soft capitalize">{latestRun.status}&hellip;</span>
          )}
          {latestRun.status === "completed" && (
            <>
              <span className="text-ink-navy-soft">
                Match rate <span className="money text-ink-navy">{((latestRun.match_rate ?? 0) * 100).toFixed(1)}%</span>
              </span>
              <span className="text-ink-navy-soft">
                Exceptions <span className="money text-ink-navy">{latestRun.exception_count}</span>
              </span>
            </>
          )}
          {latestRun.status === "failed" && <span className="text-exception">{latestRun.error}</span>}
        </div>
      )}

      <div className="mt-6">
        <QueryBox orgId={membership.organization.id} reconciliationSetId={id} />
      </div>

      <div className="mt-6">
        <SplitView
          sourceAName={sourceA.name}
          sourceBName={sourceB.name}
          pairs={pairs}
          unmatchedA={unmatchedARows}
          unmatchedB={unmatchedBRows}
        />
      </div>
    </div>
  );
}
