import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { ExceptionQueue } from "@/components/ledger/ExceptionQueue";
import type { ExceptionSeverity } from "@/types/database";

const SEVERITY_RANK: Record<ExceptionSeverity, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export default async function ExceptionsQueuePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: exceptions } = await supabase
    .from("exceptions")
    .select("*")
    .eq("reconciliation_set_id", id)
    .neq("status", "sealed")
    .neq("status", "dismissed");

  const sorted = (exceptions ?? []).sort((a, b) => {
    if (SEVERITY_RANK[b.severity] !== SEVERITY_RANK[a.severity]) {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    }
    if ((b.amount ?? 0) !== (a.amount ?? 0)) return (b.amount ?? 0) - (a.amount ?? 0);
    return b.age_days - a.age_days;
  });

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">Exceptions</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">{reconSet.name} &middot; ordered by severity, amount, age</p>
      <div className="mt-6">
        <ExceptionQueue exceptions={sorted} basePath={`/reconciliation-sets/${id}/exceptions`} />
      </div>
    </div>
  );
}
