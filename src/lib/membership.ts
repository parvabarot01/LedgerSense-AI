import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrgRole } from "@/types/database";

/**
 * API routes check roles in application code in addition to relying on RLS,
 * so a rejected write returns a clean 403 with a reason instead of a bare
 * Postgres RLS error. RLS remains the backstop if a route ever forgets this.
 */
export async function getMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as OrgRole | undefined) ?? null;
}

export function hasRole(role: OrgRole | null, allowed: OrgRole[]): boolean {
  return role !== null && allowed.includes(role);
}
