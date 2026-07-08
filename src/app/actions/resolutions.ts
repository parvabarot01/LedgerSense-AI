"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { recordAudit } from "@/lib/audit";
import { proposeResolutionSchema, decideResolutionSchema } from "@/lib/validation/schemas";
import type { Resolution } from "@/types/database";

export interface ProposeState {
  error?: string;
  resolution?: Resolution;
}

export async function proposeResolution(input: {
  orgId: string;
  exceptionId: string;
  action: string;
  notes?: string;
}): Promise<ProposeState> {
  const parsed = proposeResolutionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getMembership(supabase, user.id, parsed.data.orgId);
  if (!hasRole(role, ["owner", "admin", "analyst"])) {
    return { error: "You don't have permission to propose a resolution." };
  }

  const { data: exception } = await supabase
    .from("exceptions")
    .select("*")
    .eq("id", parsed.data.exceptionId)
    .eq("org_id", parsed.data.orgId)
    .single();
  if (!exception) return { error: "Exception not found." };
  if (exception.status === "sealed") return { error: "This exception is already sealed." };

  const { data: resolution, error } = await supabase
    .from("resolutions")
    .insert({
      org_id: parsed.data.orgId,
      exception_id: parsed.data.exceptionId,
      action: parsed.data.action,
      notes: parsed.data.notes ?? null,
      proposed_by: user.id,
    })
    .select()
    .single();
  if (error || !resolution) return { error: error?.message ?? "Could not propose resolution." };

  await supabase.from("exceptions").update({ status: "in_review" }).eq("id", parsed.data.exceptionId);

  await recordAudit(supabase, {
    orgId: parsed.data.orgId,
    actorId: user.id,
    action: "resolution.proposed",
    entityType: "resolution",
    entityId: resolution.id,
    after: { action: resolution.action, exceptionId: parsed.data.exceptionId },
  });

  revalidatePath(`/reconciliation-sets`);
  return { resolution };
}

export interface DecideState {
  error?: string;
  resolution?: Resolution;
}

export async function decideResolution(input: {
  orgId: string;
  resolutionId: string;
  approve: boolean;
  decisionNotes?: string;
}): Promise<DecideState> {
  const parsed = decideResolutionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getMembership(supabase, user.id, parsed.data.orgId);
  if (!hasRole(role, ["owner", "admin", "checker"])) {
    return { error: "You don't have permission to approve or reject a resolution." };
  }

  const { data: pending } = await supabase
    .from("resolutions")
    .select("*")
    .eq("id", parsed.data.resolutionId)
    .eq("org_id", parsed.data.orgId)
    .single();
  if (!pending) return { error: "Resolution not found." };
  if (pending.status !== "pending") return { error: "This resolution has already been decided." };
  if (pending.proposed_by === user.id) {
    return { error: "A checker must be someone other than the maker who proposed this resolution." };
  }

  const nextStatus = parsed.data.approve ? "approved" : "rejected";

  const { data: resolution, error } = await supabase
    .from("resolutions")
    .update({
      status: nextStatus,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_notes: parsed.data.decisionNotes ?? null,
    })
    .eq("id", parsed.data.resolutionId)
    .select()
    .single();
  if (error || !resolution) return { error: error?.message ?? "Could not decide resolution." };

  await supabase
    .from("exceptions")
    .update({ status: parsed.data.approve ? "sealed" : "open" })
    .eq("id", pending.exception_id);

  await recordAudit(supabase, {
    orgId: parsed.data.orgId,
    actorId: user.id,
    action: parsed.data.approve ? "resolution.approved" : "resolution.rejected",
    entityType: "resolution",
    entityId: resolution.id,
    before: { status: "pending" },
    after: { status: nextStatus, decisionNotes: parsed.data.decisionNotes ?? null },
  });

  revalidatePath(`/reconciliation-sets`);
  revalidatePath(`/approvals`);
  return { resolution };
}
