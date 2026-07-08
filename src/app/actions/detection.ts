"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { rateLimit } from "@/lib/rateLimit";
import { runDetectionSchema } from "@/lib/validation/schemas";
import { getQStashClient, qstashConfigured } from "@/lib/qstash";
import { executeDetectionRun } from "@/lib/detection/executeRun";

export interface RunDetectionState {
  error?: string;
  detectionRunId?: string;
  queued?: boolean;
}

export async function triggerDetectionRun(
  orgId: string,
  reconciliationSetId: string
): Promise<RunDetectionState> {
  const parsed = runDetectionSchema.safeParse({ orgId, reconciliationSetId });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getMembership(supabase, user.id, orgId);
  if (!hasRole(role, ["owner", "admin", "analyst"])) {
    return { error: "You don't have permission to run detection." };
  }

  const limit = await rateLimit.detection(`${orgId}:${user.id}`);
  if (!limit.success) return { error: "Too many detection runs. Try again in a minute." };

  const { data: run, error } = await supabase
    .from("detection_runs")
    .insert({
      org_id: orgId,
      reconciliation_set_id: reconciliationSetId,
      status: "queued",
      triggered_by: user.id,
    })
    .select()
    .single();
  if (error || !run) return { error: error?.message ?? "Could not start detection run." };

  if (qstashConfigured) {
    const qstash = getQStashClient();
    await qstash!.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/detection/callback`,
      body: { orgId, reconciliationSetId, detectionRunId: run.id, triggeredBy: user.id },
    });
    return { detectionRunId: run.id, queued: true };
  }

  // Dev fallback: no QStash configured, run inline with the user's own
  // session client (RLS still applies - the role check above already
  // gated this, so it's redundant defense, not a bypass).
  await executeDetectionRun(supabase, {
    orgId,
    reconciliationSetId,
    detectionRunId: run.id,
    triggeredBy: user.id,
  });

  revalidatePath(`/reconciliation-sets/${reconciliationSetId}`);
  return { detectionRunId: run.id, queued: false };
}
