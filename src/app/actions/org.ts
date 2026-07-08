"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createOrganizationSchema } from "@/lib/validation/schemas";
import { recordAudit } from "@/lib/audit";
import { ORG_COOKIE } from "@/lib/org";
import type { ActionState } from "./auth";

export async function createOrganization(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select()
    .single();

  if (error) {
    return {
      error: error.code === "23505" ? "That workspace URL is already taken." : error.message,
    };
  }

  await recordAudit(supabase, {
    orgId: org!.id,
    actorId: user!.id,
    action: "organization.created",
    entityType: "organization",
    entityId: org!.id,
    after: { name: org!.name, slug: org!.slug },
  });

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, org!.id, { httpOnly: true, sameSite: "lax", path: "/" });

  redirect("/dashboard");
}

export async function switchOrganization(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}
