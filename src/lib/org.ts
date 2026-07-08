import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database, Organization, OrgRole } from "@/types/database";

const ORG_COOKIE = "ls_org_id";

export interface OrgMembership {
  organization: Organization;
  role: OrgRole;
}

export async function getUserOrganizations(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OrgMembership[]> {
  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.org_id);
  const { data: organizations } = await supabase.from("organizations").select("*").in("id", orgIds);
  const orgById = new Map((organizations ?? []).map((org) => [org.id, org]));

  return memberships
    .filter((m) => orgById.has(m.org_id))
    .map((m) => ({
      organization: orgById.get(m.org_id)!,
      role: m.role as OrgRole,
    }));
}

/** Reads the org selected via cookie, falling back to the user's first org. */
export async function getCurrentOrg(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OrgMembership | null> {
  const memberships = await getUserOrganizations(supabase, userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ORG_COOKIE)?.value;
  const selected = memberships.find((m) => m.organization.id === selectedId);
  return selected ?? memberships[0];
}

export { ORG_COOKIE };
