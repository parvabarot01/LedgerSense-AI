import Link from "next/link";
import { Money } from "./Money";
import { StatusChip } from "./StatusChip";
import { cn } from "@/lib/utils";
import type { ExceptionRow } from "@/types/database";

const TYPE_LABELS: Record<ExceptionRow["type"], string> = {
  outlier: "Statistical outlier",
  duplicate: "Duplicate",
  mismatch: "Mismatch",
  timing_gap: "Timing gap",
  unmatched: "Unmatched",
};

const SEVERITY_DOT: Record<ExceptionRow["severity"], string> = {
  critical: "bg-exception",
  high: "bg-exception/70",
  medium: "bg-brass",
  low: "bg-ink-navy-soft/40",
};

export function ExceptionQueue({
  exceptions,
  basePath,
}: {
  exceptions: ExceptionRow[];
  basePath: string;
}) {
  if (exceptions.length === 0) {
    return (
      <div className="rounded-sm border border-hairline bg-paper-raised p-8 text-center text-sm text-ink-navy-soft">
        No exceptions. Run detection to check for anomalies.
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline rounded-sm border border-hairline bg-paper-raised">
      {exceptions.map((exception) => (
        <Link
          key={exception.id}
          href={`${basePath}/${exception.id}`}
          className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-fast ease-out hover:bg-paper"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[exception.severity])} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-navy">{TYPE_LABELS[exception.type]}</p>
            <p className="mt-0.5 truncate text-xs text-ink-navy-soft">{exception.rule_description}</p>
          </div>
          <span className="text-xs text-ink-navy-soft">{exception.age_days}d old</span>
          <Money amount={exception.amount} tone="exception" className="w-28 shrink-0" />
          <StatusChip status={exception.status} className="shrink-0" />
        </Link>
      ))}
    </div>
  );
}
