import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { toCsv } from "@/lib/csv";
import { recordAudit } from "@/lib/audit";
import type { Explanation, Resolution } from "@/types/database";

/**
 * Exportable audit trail: one row per exception, with its latest AI
 * explanation and the full maker-checker chain, so an auditor gets exactly
 * what section 5 (Sprint 3 "Resolution audit report") calls for without
 * needing direct database access.
 */
export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId");
  const reconciliationSetId = request.nextUrl.searchParams.get("reconciliationSetId") ?? undefined;

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const role = await getMembership(supabase, user.id, orgId);
  if (!hasRole(role, ["owner", "admin", "analyst", "checker", "auditor"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase.from("exceptions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (reconciliationSetId) query = query.eq("reconciliation_set_id", reconciliationSetId);
  const { data: exceptions } = await query;

  const exceptionIds = (exceptions ?? []).map((e) => e.id);
  const [{ data: explanations }, { data: resolutions }] = exceptionIds.length
    ? await Promise.all([
        supabase.from("explanations").select("*").in("exception_id", exceptionIds),
        supabase.from("resolutions").select("*").in("exception_id", exceptionIds),
      ])
    : [{ data: [] }, { data: [] }];

  const latestExplanationByException = new Map<string, Explanation>();
  for (const explanation of explanations ?? []) {
    const existing = latestExplanationByException.get(explanation.exception_id);
    if (!existing || new Date(explanation.created_at) > new Date(existing.created_at)) {
      latestExplanationByException.set(explanation.exception_id, explanation);
    }
  }

  const latestResolutionByException = new Map<string, Resolution>();
  for (const resolution of resolutions ?? []) {
    const existing = latestResolutionByException.get(resolution.exception_id);
    if (!existing || new Date(resolution.proposed_at) > new Date(existing.proposed_at)) {
      latestResolutionByException.set(resolution.exception_id, resolution);
    }
  }

  const headers = [
    "exception_id",
    "type",
    "severity",
    "rule_code",
    "rule_description",
    "amount",
    "status",
    "flagged_at",
    "explanation_summary",
    "suggested_resolution",
    "resolution_action",
    "resolution_status",
    "proposed_by",
    "proposed_at",
    "decided_by",
    "decided_at",
    "decision_notes",
  ];

  const rows = (exceptions ?? []).map((exception) => {
    const explanation = latestExplanationByException.get(exception.id);
    const resolution = latestResolutionByException.get(exception.id);
    return [
      exception.id,
      exception.type,
      exception.severity,
      exception.rule_code,
      exception.rule_description,
      exception.amount,
      exception.status,
      exception.created_at,
      explanation?.summary ?? "",
      explanation?.suggested_resolution ?? "",
      resolution?.action ?? "",
      resolution?.status ?? "",
      resolution?.proposed_by ?? "",
      resolution?.proposed_at ?? "",
      resolution?.decided_by ?? "",
      resolution?.decided_at ?? "",
      resolution?.decision_notes ?? "",
    ];
  });

  await recordAudit(supabase, {
    orgId,
    actorId: user.id,
    action: "audit_report.exported",
    entityType: "organization",
    entityId: orgId,
    after: { reconciliationSetId: reconciliationSetId ?? null, rowCount: rows.length },
  });

  const csv = toCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="ledgersense-audit-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
