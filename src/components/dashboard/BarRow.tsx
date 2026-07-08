import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  exception: "bg-exception",
  reconciled: "bg-reconciled",
  brass: "bg-brass",
  neutral: "bg-ink-navy-soft/50",
};

export function BarRow({
  label,
  value,
  max,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "exception" | "reconciled" | "brass" | "neutral";
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-ink-navy-soft">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-hairline/60">
        <div
          className={cn("h-full rounded-full transition-all duration-slow ease-out", TONE_CLASSES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-ink-navy money">{value}</span>
    </div>
  );
}
