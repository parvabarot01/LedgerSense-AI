import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { Money } from "@/components/ledger/Money";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function DataSourceExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: source } = await supabase
    .from("data_sources")
    .select("*")
    .eq("id", id)
    .eq("org_id", membership.organization.id)
    .single();
  if (!source) notFound();

  const table = source.kind === "ledger" ? "ledger_entries" : "transactions";
  const dateColumn = source.kind === "ledger" ? "entry_date" : "txn_date";

  let query = supabase
    .from(table)
    .select("*", { count: "exact" })
    .eq("data_source_id", id)
    .order(dateColumn, { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    query = query.or(`counterparty.ilike.%${q}%,description.ilike.%${q}%,external_ref.ilike.%${q}%`);
  }

  const { data: records, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">{source.name}</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">
        {(count ?? 0).toLocaleString()} {source.kind === "ledger" ? "ledger entries" : "transactions"}
      </p>

      <form className="mt-6" action={`/sources/${id}`}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search counterparty, description, or reference"
          className="w-full max-w-md rounded-sm border border-hairline bg-paper-raised px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        />
      </form>

      <div className="mt-6 overflow-x-auto rounded-sm border border-hairline bg-paper-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-navy-soft">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Counterparty</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Reference</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(records ?? []).map((record) => (
              <tr key={record.id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 figures-tabular text-ink-navy-soft">
                  {formatDate((record as { txn_date?: string; entry_date?: string }).txn_date ?? (record as { entry_date?: string }).entry_date!)}
                </td>
                <td className="px-4 py-2.5 text-ink-navy">{record.counterparty || "—"}</td>
                <td className="px-4 py-2.5 text-ink-navy-soft">{record.description || "—"}</td>
                <td className="px-4 py-2.5 figures-tabular text-ink-navy-soft">{record.external_ref || "—"}</td>
                <td className="px-4 py-2.5">
                  <Money amount={record.amount} currency={record.currency} />
                </td>
              </tr>
            ))}
            {(records ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-navy-soft">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-4 text-sm text-ink-navy-soft">
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
