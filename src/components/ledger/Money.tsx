import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";

export function Money({
  amount,
  currency = "USD",
  className,
  tone,
}: {
  amount: number | null | undefined;
  currency?: string;
  className?: string;
  tone?: "reconciled" | "exception" | "neutral";
}) {
  if (amount === null || amount === undefined) {
    return <span className={cn("money text-ink-navy-soft", className)}>&mdash;</span>;
  }

  const toneClass =
    tone === "reconciled"
      ? "text-reconciled"
      : tone === "exception"
      ? "text-exception"
      : "text-ink-navy";

  return <span className={cn("money", toneClass, className)}>{formatMoney(amount, currency)}</span>;
}
