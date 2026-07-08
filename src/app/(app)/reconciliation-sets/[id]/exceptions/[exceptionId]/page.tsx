import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { fetchRecordsByIds } from "@/lib/detection/enrich";
import { ExceptionEvidence } from "@/components/ledger/ExceptionEvidence";
import { StatusChip } from "@/components/ledger/StatusChip";
import { Money } from "@/components/ledger/Money";
import type { LedgerRecord } from "@/types/database";
import { ExplanationPanel } from "@/components/ai/ExplanationPanel";
import { ResolutionPanel } from "@/components/resolution/ResolutionPanel";

const TYPE_LABELS: Record<string, string> = {
  outlier: "Statistical outlier",
  duplicate: "Duplicate",
  mismatch: "Reconciliation mismatch",
  timing_gap: "Timing gap",
  unmatched: "Unmatched",
};

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; exceptionId: string }>;
}) {
  const { id, exceptionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: exception } = await supabase
    .from("exceptions")
    .select("*")
    .eq("id", exceptionId)
    .eq("reconciliation_set_id", id)
    .single();
  if (!exception) notFound();

  const transactionIds = exception.record_refs.filter((r) => r.table === "transaction").map((r) => r.id);
  const ledgerIds = exception.record_refs.filter((r) => r.table === "ledger_entry").map((r) => r.id);

  const [transactionRecords, ledgerRecords] = await Promise.all([
    fetchRecordsByIds(supabase, "transactions", transactionIds),
    fetchRecordsByIds(supabase, "ledger_entries", ledgerIds),
  ]);

  const records: LedgerRecord[] = [...transactionRecords.values(), ...ledgerRecords.values()];

  const { data: explanation } = await supabase
    .from("explanations")
    .select("*")
    .eq("exception_id", exceptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: resolutions } = await supabase
    .from("resolutions")
    .select("*")
    .eq("exception_id", exceptionId)
    .order("proposed_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/reconciliation-sets/${id}/exceptions`} className="text-sm text-trace hover:underline">
        &larr; Back to exceptions
      </Link>

      <div className="mt-4 rounded-sm border border-hairline bg-paper-raised p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-navy-soft">
              {TYPE_LABELS[exception.type] ?? exception.type}
            </p>
            <h1 className="mt-1 font-display text-xl text-ink-navy">{exception.rule_description}</h1>
          </div>
          <StatusChip status={exception.status} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-ink-navy-soft">
          <span>
            Rule <code className="figures-tabular text-ink-navy">{exception.rule_code}</code>
          </span>
          <Money amount={exception.amount} tone="exception" />
          <span>{exception.age_days} day(s) old</span>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink-navy">Flagged rows</p>
          <ExceptionEvidence records={records} />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink-navy">Explanation</p>
          <ExplanationPanel
            orgId={membership.organization.id}
            exceptionId={exception.id}
            initialExplanation={explanation ?? null}
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink-navy">Resolution</p>
          <ResolutionPanel
            orgId={membership.organization.id}
            exceptionId={exception.id}
            exceptionStatus={exception.status}
            resolutions={resolutions ?? []}
            currentUserId={user.id}
            currentUserRole={membership.role}
          />
        </div>
      </div>
    </div>
  );
}
