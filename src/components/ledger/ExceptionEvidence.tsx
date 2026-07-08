import { formatDate } from "@/lib/utils";
import { Money } from "./Money";
import type { LedgerRecord } from "@/types/database";

function recordDate(r: LedgerRecord): string {
  return r.txn_date ?? r.entry_date ?? "";
}

export function ExceptionEvidence({ records }: { records: LedgerRecord[] }) {
  return (
    <div className="animate-trace-pulse rounded-sm border border-trace/30 bg-trace-tint/40 divide-y divide-trace/20">
      {records.map((record) => (
        <div key={record.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-navy">{record.counterparty || record.description || "—"}</p>
            <p className="figures-tabular mt-0.5 text-xs text-ink-navy-soft">
              {formatDate(recordDate(record))}
              {record.external_ref ? ` · ${record.external_ref}` : ""}
            </p>
          </div>
          <Money amount={record.amount} currency={record.currency} />
        </div>
      ))}
      {records.length === 0 && <p className="p-4 text-sm text-ink-navy-soft">No rows found.</p>}
    </div>
  );
}
