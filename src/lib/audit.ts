import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface RecordAuditParams {
  orgId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Every dataset mutation, detection run, exception status change, and
 * approval decision writes one of these. audit_log has no update/delete RLS
 * policy (see supabase/migrations/0002_rls.sql), so once written a row is
 * permanent: this is the audit trail the product's whole value proposition
 * depends on, not a debug log.
 */
export async function recordAudit(
  supabase: SupabaseClient<Database>,
  params: RecordAuditParams
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    org_id: params.orgId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });

  if (error) {
    // Auditing must never silently vanish: surface it so the caller's error
    // handling (and logs) catch it, but don't let it mask the original
    // mutation's own success/failure by throwing mid-request.
    console.error("audit_log insert failed", { action: params.action, entityType: params.entityType, error });
  }
}
