import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { Money } from "@/components/ledger/Money";
import { StatusChip } from "@/components/ledger/StatusChip";

const ACTION_LABELS: Record<string, string> = {
  match: "Manually match",
  write_off: "Write off",
  escalate: "Escalate",
  dismiss: "Dismiss",
};

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: pending } = await supabase
    .from("resolutions")
    .select("*")
    .eq("org_id", membership.organization.id)
    .eq("status", "pending")
    .order("proposed_at", { ascending: true });

  const exceptionIds = (pending ?? []).map((r) => r.exception_id);
  const { data: exceptions } = exceptionIds.length
    ? await supabase.from("exceptions").select("*").in("id", exceptionIds)
    : { data: [] };
  const exceptionById = new Map((exceptions ?? []).map((e) => [e.id, e]));

  const reconSetIds = Array.from(new Set((exceptions ?? []).map((e) => e.reconciliation_set_id)));
  const { data: reconSets } = reconSetIds.length
    ? await supabase.from("reconciliation_sets").select("id, name").in("id", reconSetIds)
    : { data: [] };
  const reconSetNameById = new Map((reconSets ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">Approvals</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">
        Resolutions proposed by a maker, waiting on a checker&apos;s second signature.
      </p>

      <div className="mt-8 divide-y divide-hairline rounded-sm border border-hairline bg-paper-raised">
        {(pending ?? []).length === 0 && (
          <p className="p-6 text-sm text-ink-navy-soft">Nothing waiting on approval right now.</p>
        )}
        {(pending ?? []).map((resolution) => {
          const exception = exceptionById.get(resolution.exception_id);
          if (!exception) return null;
          return (
            <Link
              key={resolution.id}
              href={`/reconciliation-sets/${exception.reconciliation_set_id}/exceptions/${exception.id}`}
              className="flex items-center justify-between gap-4 px-6 py-4 transition-colors duration-fast ease-out hover:bg-paper"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink-navy">
                  {ACTION_LABELS[resolution.action] ?? resolution.action} &middot;{" "}
                  {reconSetNameById.get(exception.reconciliation_set_id) ?? "Reconciliation set"}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-navy-soft">{exception.rule_description}</p>
              </div>
              <Money amount={exception.amount} tone="exception" className="shrink-0" />
              <StatusChip status="pending" className="shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
