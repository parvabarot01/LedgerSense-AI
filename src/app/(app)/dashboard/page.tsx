import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { StatTile } from "@/components/dashboard/StatTile";
import { BarRow } from "@/components/dashboard/BarRow";
import { Money } from "@/components/ledger/Money";
import type { DetectionRun, ExceptionSeverity } from "@/types/database";

const SEVERITY_ORDER: ExceptionSeverity[] = ["critical", "high", "medium", "low"];
const AGE_BUCKETS = [
  { label: "0-7d", min: 0, max: 7 },
  { label: "8-30d", min: 8, max: 30 },
  { label: "31-60d", min: 31, max: 60 },
  { label: "60d+", min: 61, max: Infinity },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentOrg(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const orgId = membership.organization.id;

  const { data: reconSets } = await supabase
    .from("reconciliation_sets")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  const { data: openExceptions } = await supabase
    .from("exceptions")
    .select("*")
    .eq("org_id", orgId)
    .in("status", ["open", "in_review"]);

  const { data: sealedExceptions } = await supabase
    .from("exceptions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "sealed");

  const { data: latestRuns } = await supabase
    .from("detection_runs")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const latestRunBySet = new Map<string, DetectionRun>();
  for (const run of latestRuns ?? []) {
    if (!latestRunBySet.has(run.reconciliation_set_id)) {
      latestRunBySet.set(run.reconciliation_set_id, run);
    }
  }

  const open = openExceptions ?? [];
  const severityCounts = SEVERITY_ORDER.reduce<Record<ExceptionSeverity, number>>(
    (acc, s) => ({ ...acc, [s]: open.filter((e) => e.severity === s).length }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const ageCounts = AGE_BUCKETS.map((bucket) => ({
    ...bucket,
    count: open.filter((e) => e.age_days >= bucket.min && e.age_days <= bucket.max).length,
  }));

  const largestOpen = [...open].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 5);
  const oldestOpen = [...open].sort((a, b) => b.age_days - a.age_days).slice(0, 5);

  const avgMatchRate =
    (reconSets ?? []).length > 0
      ? (reconSets ?? []).reduce((sum, set) => sum + (latestRunBySet.get(set.id)?.match_rate ?? 0), 0) /
        (reconSets ?? []).length
      : 0;

  const maxSeverity = Math.max(...Object.values(severityCounts), 1);
  const maxAge = Math.max(...ageCounts.map((b) => b.count), 1);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-navy">Executive dashboard</h1>
      <p className="mt-1 text-sm text-ink-navy-soft">
        Reconciliation health, aging, and largest breaks across every set.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Avg. match rate" value={`${(avgMatchRate * 100).toFixed(1)}%`} tone="reconciled" />
        <StatTile label="Open exceptions" value={String(open.length)} tone="exception" />
        <StatTile label="Sealed" value={String(sealedExceptions?.length ?? 0)} tone="brass" />
        <StatTile label="Reconciliation sets" value={String((reconSets ?? []).length)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-hairline bg-paper-raised p-5">
          <p className="mb-4 text-sm font-medium text-ink-navy">Open exceptions by severity</p>
          <div className="space-y-3">
            {SEVERITY_ORDER.map((severity) => (
              <BarRow
                key={severity}
                label={severity}
                value={severityCounts[severity]}
                max={maxSeverity}
                tone={severity === "critical" || severity === "high" ? "exception" : "neutral"}
              />
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-paper-raised p-5">
          <p className="mb-4 text-sm font-medium text-ink-navy">Aging of unresolved exceptions</p>
          <div className="space-y-3">
            {ageCounts.map((bucket) => (
              <BarRow key={bucket.label} label={bucket.label} value={bucket.count} max={maxAge} tone="exception" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-hairline bg-paper-raised">
          <p className="border-b border-hairline px-5 py-3 text-sm font-medium text-ink-navy">Largest open breaks</p>
          <div className="divide-y divide-hairline">
            {largestOpen.map((e) => (
              <Link
                key={e.id}
                href={`/reconciliation-sets/${e.reconciliation_set_id}/exceptions/${e.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm transition-colors duration-fast ease-out hover:bg-paper"
              >
                <span className="truncate text-ink-navy-soft">{e.rule_description}</span>
                <Money amount={e.amount} tone="exception" className="shrink-0" />
              </Link>
            ))}
            {largestOpen.length === 0 && <p className="px-5 py-4 text-sm text-ink-navy-soft">No open exceptions.</p>}
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-paper-raised">
          <p className="border-b border-hairline px-5 py-3 text-sm font-medium text-ink-navy">Oldest open breaks</p>
          <div className="divide-y divide-hairline">
            {oldestOpen.map((e) => (
              <Link
                key={e.id}
                href={`/reconciliation-sets/${e.reconciliation_set_id}/exceptions/${e.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm transition-colors duration-fast ease-out hover:bg-paper"
              >
                <span className="truncate text-ink-navy-soft">{e.rule_description}</span>
                <span className="shrink-0 text-xs text-ink-navy-soft">{e.age_days}d</span>
              </Link>
            ))}
            {oldestOpen.length === 0 && <p className="px-5 py-4 text-sm text-ink-navy-soft">No open exceptions.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-sm border border-hairline bg-paper-raised">
        <p className="border-b border-hairline px-5 py-3 text-sm font-medium text-ink-navy">
          Reconciliation set health
        </p>
        <div className="divide-y divide-hairline">
          {(reconSets ?? []).map((set) => {
            const run = latestRunBySet.get(set.id);
            return (
              <Link
                key={set.id}
                href={`/reconciliation-sets/${set.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm transition-colors duration-fast ease-out hover:bg-paper"
              >
                <span className="text-ink-navy">{set.name}</span>
                <span className="text-ink-navy-soft">
                  {run ? `${((run.match_rate ?? 0) * 100).toFixed(1)}% matched` : "No runs yet"}
                </span>
              </Link>
            );
          })}
          {(reconSets ?? []).length === 0 && (
            <p className="px-5 py-4 text-sm text-ink-navy-soft">
              No reconciliation sets yet.{" "}
              <Link href="/reconciliation-sets/new" className="text-trace hover:underline">
                Create one
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
