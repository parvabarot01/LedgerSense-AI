import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { Button } from "@/components/ui/Button";

export default async function ReconciliationSetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: sets } = await supabase
    .from("reconciliation_sets")
    .select("*")
    .eq("org_id", membership.organization.id)
    .order("created_at", { ascending: false });

  const sourceIds = Array.from(
    new Set((sets ?? []).flatMap((s) => [s.source_a_id, s.source_b_id]))
  );
  const { data: sources } = sourceIds.length
    ? await supabase.from("data_sources").select("id, name").in("id", sourceIds)
    : { data: [] };
  const sourceNameById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-navy">Reconciliation sets</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">Pairs of data sources reconciled against each other.</p>
        </div>
        <Link href="/reconciliation-sets/new">
          <Button>New reconciliation set</Button>
        </Link>
      </div>

      <div className="mt-8 divide-y divide-hairline rounded-sm border border-hairline bg-paper-raised">
        {(sets ?? []).length === 0 && (
          <p className="p-6 text-sm text-ink-navy-soft">
            No reconciliation sets yet. Pair two data sources to start reconciling them.
          </p>
        )}
        {(sets ?? []).map((set) => (
          <Link
            key={set.id}
            href={`/reconciliation-sets/${set.id}`}
            className="flex items-center justify-between px-6 py-4 transition-colors duration-fast ease-out hover:bg-paper"
          >
            <div>
              <p className="text-sm font-medium text-ink-navy">{set.name}</p>
              <p className="mt-0.5 text-xs text-ink-navy-soft">
                {sourceNameById.get(set.source_a_id) ?? "Source A"} vs.{" "}
                {sourceNameById.get(set.source_b_id) ?? "Source B"}
              </p>
            </div>
            <p className="text-xs text-ink-navy-soft">{set.match_window_days}-day window</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
