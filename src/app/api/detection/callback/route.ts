import { NextResponse, type NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createServiceClient } from "@/lib/supabase/server";
import { executeDetectionRun } from "@/lib/detection/executeRun";

export const runtime = "nodejs";

interface CallbackBody {
  orgId: string;
  reconciliationSetId: string;
  detectionRunId: string;
  triggeredBy: string | null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });
    const signature = request.headers.get("upstash-signature");
    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 401 });

    const valid = await receiver
      .verify({ signature, body })
      .then(() => true)
      .catch(() => false);
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as CallbackBody;
  const supabase = createServiceClient();

  await executeDetectionRun(supabase, {
    orgId: payload.orgId,
    reconciliationSetId: payload.reconciliationSetId,
    detectionRunId: payload.detectionRunId,
    triggeredBy: payload.triggeredBy,
  });

  return NextResponse.json({ ok: true });
}
