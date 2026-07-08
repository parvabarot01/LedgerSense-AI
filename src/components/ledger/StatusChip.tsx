import { cn } from "@/lib/utils";
import type { ExceptionStatus, ResolutionStatus } from "@/types/database";

type Status = ExceptionStatus | ResolutionStatus | "matched" | "disputed";

const styles: Record<Status, string> = {
  open: "bg-exception-tint text-exception",
  in_review: "bg-trace-tint text-trace",
  sealed: "bg-brass-tint text-brass",
  dismissed: "bg-ink-navy/5 text-ink-navy-soft",
  pending: "bg-trace-tint text-trace",
  approved: "bg-brass-tint text-brass",
  rejected: "bg-exception-tint text-exception",
  matched: "bg-reconciled-tint text-reconciled",
  disputed: "bg-exception-tint text-exception",
};

const labels: Record<Status, string> = {
  open: "Open",
  in_review: "In review",
  sealed: "Sealed",
  dismissed: "Dismissed",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  matched: "Matched",
  disputed: "Disputed",
};

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {status === "sealed" && <span aria-hidden>&#9679;</span>}
      {labels[status]}
    </span>
  );
}
