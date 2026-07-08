export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "reconciled" | "exception" | "brass";
}) {
  const toneClass =
    tone === "reconciled"
      ? "text-reconciled"
      : tone === "exception"
      ? "text-exception"
      : tone === "brass"
      ? "text-brass"
      : "text-ink-navy";

  return (
    <div className="rounded-sm border border-hairline bg-paper-raised p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-navy-soft">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
