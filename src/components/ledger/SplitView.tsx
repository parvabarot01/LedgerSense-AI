import { cn, formatDate } from "@/lib/utils";
import { Money } from "./Money";
import type { LedgerRecord } from "@/types/database";

interface PairRow {
  status: "matched" | "disputed";
  a: LedgerRecord;
  b: LedgerRecord;
}

function recordDate(r: LedgerRecord): string {
  return r.txn_date ?? r.entry_date ?? "";
}

function RecordCell({ record, tone }: { record: LedgerRecord; tone: "reconciled" | "exception" }) {
  return (
    <div className="flex-1 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-navy">{record.counterparty || record.description || "—"}</p>
          <p className="figures-tabular mt-0.5 text-xs text-ink-navy-soft">
            {formatDate(recordDate(record))}
            {record.external_ref ? ` · ${record.external_ref}` : ""}
          </p>
        </div>
        <Money amount={record.amount} currency={record.currency} tone={tone} className="shrink-0" />
      </div>
    </div>
  );
}

function EmptyCell({ label }: { label: string }) {
  return (
    <div className="flex-1 border border-dashed border-exception/30 bg-exception-tint/40 px-4 py-3">
      <p className="text-xs italic text-exception/80">{label}</p>
    </div>
  );
}

export function SplitView({
  sourceAName,
  sourceBName,
  pairs,
  unmatchedA,
  unmatchedB,
}: {
  sourceAName: string;
  sourceBName: string;
  pairs: PairRow[];
  unmatchedA: LedgerRecord[];
  unmatchedB: LedgerRecord[];
}) {
  return (
    <div className="rounded-sm border border-hairline bg-paper-raised">
      <div className="grid grid-cols-2 border-b border-hairline text-xs font-medium uppercase tracking-wide text-ink-navy-soft">
        <div className="px-4 py-2.5">{sourceAName}</div>
        <div className="border-l border-hairline px-4 py-2.5">{sourceBName}</div>
      </div>

      <div className="divide-y divide-hairline">
        {pairs.map((pair, i) => (
          <div
            key={`pair-${i}`}
            className={cn(
              "group grid grid-cols-2 animate-settle",
              pair.status === "matched" ? "bg-reconciled-tint" : "bg-exception-tint"
            )}
            style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
          >
            <RecordCell record={pair.a} tone={pair.status === "matched" ? "reconciled" : "exception"} />
            <div className="border-l border-hairline">
              <RecordCell record={pair.b} tone={pair.status === "matched" ? "reconciled" : "exception"} />
            </div>
          </div>
        ))}

        {unmatchedA.map((record, i) => (
          <div key={`unmatched-a-${i}`} className="grid grid-cols-2 bg-exception-tint/60 animate-settle">
            <RecordCell record={record} tone="exception" />
            <div className="border-l border-hairline p-2">
              <EmptyCell label="No match found" />
            </div>
          </div>
        ))}

        {unmatchedB.map((record, i) => (
          <div key={`unmatched-b-${i}`} className="grid grid-cols-2 bg-exception-tint/60 animate-settle">
            <div className="p-2">
              <EmptyCell label="No match found" />
            </div>
            <div className="border-l border-hairline">
              <RecordCell record={record} tone="exception" />
            </div>
          </div>
        ))}

        {pairs.length === 0 && unmatchedA.length === 0 && unmatchedB.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-navy-soft">
            No detection run yet. Run detection to see matched and unmatched rows.
          </p>
        )}
      </div>
    </div>
  );
}
