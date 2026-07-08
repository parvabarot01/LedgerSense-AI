import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { Button } from "@/components/ui/Button";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: sets } = await supabase
    .from("reconciliation_sets")
    .select("id, name")
    .eq("org_id", membership.organization.id)
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">Reports</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">
        Exportable audit trail: every exception, its explanation, the rule that flagged it, and the full
        approval chain.
      </p>

      <div className="mt-8 divide-y divide-hairline rounded-sm border border-hairline bg-paper-raised">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-ink-navy">All reconciliation sets</p>
            <p className="mt-0.5 text-xs text-ink-navy-soft">Full workspace audit report</p>
          </div>
          <a href={`/api/reports/audit?orgId=${membership.organization.id}`}>
            <Button variant="secondary">Export CSV</Button>
          </a>
        </div>
        {(sets ?? []).map((set) => (
          <div key={set.id} className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-ink-navy">{set.name}</p>
            <a href={`/api/reports/audit?orgId=${membership.organization.id}&reconciliationSetId=${set.id}`}>
              <Button variant="secondary">Export CSV</Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
