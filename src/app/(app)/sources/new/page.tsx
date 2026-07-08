import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { NewSourceForm } from "@/components/ingestion/NewSourceForm";

export default async function NewSourcePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">Add a data source</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">
        Create the source, then upload a CSV and map its columns.
      </p>
      <div className="mt-8">
        <NewSourceForm orgId={membership.organization.id} />
      </div>
    </div>
  );
}
