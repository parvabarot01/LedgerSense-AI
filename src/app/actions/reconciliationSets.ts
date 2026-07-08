"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { recordAudit } from "@/lib/audit";
import { createReconciliationSetSchema } from "@/lib/validation/schemas";
import type { ActionState } from "./auth";

export interface CreateReconciliationSetState extends ActionState {
  reconciliationSetId?: string;
}

export async function createReconciliationSet(
  _prevState: CreateReconciliationSetState,
  formData: FormData
): Promise<CreateReconciliationSetState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = createReconciliationSetSchema.safeParse({
    orgId: formData.get("orgId"),
    name: formData.get("name"),
    sourceAId: formData.get("sourceAId"),
    sourceBId: formData.get("sourceBId"),
    matchWindowDays: Number(formData.get("matchWindowDays") ?? 3),
    amountTolerance: Number(formData.get("amountTolerance") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (parsed.data.sourceAId === parsed.data.sourceBId) {
    return { error: "Source A and source B must be different data sources." };
  }

  const role = await getMembership(supabase, user!.id, parsed.data.orgId);
  if (!hasRole(role, ["owner", "admin", "analyst"])) {
    return { error: "You don't have permission to create a reconciliation set." };
  }

  const { data: reconSet, error } = await supabase
    .from("reconciliation_sets")
    .insert({
      org_id: parsed.data.orgId,
      name: parsed.data.name,
      source_a_id: parsed.data.sourceAId,
      source_b_id: parsed.data.sourceBId,
      match_window_days: parsed.data.matchWindowDays,
      amount_tolerance: parsed.data.amountTolerance,
      created_by: user!.id,
    })
    .select()
    .single();

  if (error || !reconSet) return { error: error?.message ?? "Could not create reconciliation set." };

  await recordAudit(supabase, {
    orgId: parsed.data.orgId,
    actorId: user!.id,
    action: "reconciliation_set.created",
    entityType: "reconciliation_set",
    entityId: reconSet.id,
    after: { name: reconSet.name, sourceAId: reconSet.source_a_id, sourceBId: reconSet.source_b_id },
  });

  redirect(`/reconciliation-sets/${reconSet.id}`);
}
