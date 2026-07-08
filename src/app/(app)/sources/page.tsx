import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default async function SourcesPage() {
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
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-navy">Data sources</h1>
          <p className="mt-1 text-sm text-ink-navy-soft">
            Bank feeds, ledgers, and processor payouts ingested into LedgerSense.
          </p>
        </div>
        <Link href="/sources/new">
          <Button>Add data source</Button>
        </Link>
      </div>

      <div className="mt-8 divide-y divide-hairline rounded-sm border border-hairline bg-paper-raised">
        {(sources ?? []).length === 0 && (
          <p className="p-6 text-sm text-ink-navy-soft">
            No data sources yet. Add one to start ingesting transactions or ledger entries.
          </p>
        )}
        {(sources ?? []).map((source) => (
          <Link
            key={source.id}
            href={`/sources/${source.id}`}
            className="flex items-center justify-between px-6 py-4 transition-colors duration-fast ease-out hover:bg-paper"
          >
            <div>
              <p className="text-sm font-medium text-ink-navy">{source.name}</p>
              <p className="mt-0.5 text-xs text-ink-navy-soft">
                {source.kind === "ledger" ? "Ledger" : "Transaction"} &middot; {source.origin.replace("_", " ")}
              </p>
            </div>
            <div className="text-right">
              <p className="money text-sm text-ink-navy">{source.row_count.toLocaleString()} rows</p>
              <p className="mt-0.5 text-xs text-ink-navy-soft">added {formatDate(source.created_at)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
