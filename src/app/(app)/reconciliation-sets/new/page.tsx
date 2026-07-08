import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { NewReconciliationSetForm } from "@/components/reconciliation/NewReconciliationSetForm";

export default async function NewReconciliationSetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: sources } = await supabase
    .from("data_sources")
    .select("*")
    .eq("org_id", membership.organization.id)
    .order("name");

  if (!sources || sources.length < 2) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink-navy">New reconciliation set</h1>
        <p className="mt-4 max-w-md text-sm text-ink-navy-soft">
          You need at least two data sources before you can pair them for reconciliation.{" "}
          <Link href="/sources/new" className="text-trace hover:underline">
            Add a data source
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">New reconciliation set</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">Pair two data sources to reconcile them against each other.</p>
      <div className="mt-8">
        <NewReconciliationSetForm orgId={membership.organization.id} sources={sources} />
      </div>
    </div>
  );
}
