"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { proposeResolution, decideResolution } from "@/app/actions/resolutions";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ledger/StatusChip";
import type { ExceptionStatus, OrgRole, Resolution } from "@/types/database";

const ACTION_LABELS: Record<string, string> = {
  match: "Manually match",
  write_off: "Write off",
  escalate: "Escalate",
  dismiss: "Dismiss",
};

export function ResolutionPanel({
  orgId,
  exceptionId,
  exceptionStatus,
  resolutions,
  currentUserId,
  currentUserRole,
}: {
  orgId: string;
  exceptionId: string;
  exceptionStatus: ExceptionStatus;
  resolutions: Resolution[];
  currentUserId: string;
  currentUserRole: OrgRole;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState("match");
  const [notes, setNotes] = useState("");

  const pending = resolutions.find((r) => r.status === "pending");
  const canPropose = !pending && exceptionStatus !== "sealed";
  const canDecide =
    pending && ["owner", "admin", "checker"].includes(currentUserRole) && pending.proposed_by !== currentUserId;

  return (
    <div className="space-y-4">
      {resolutions.length > 0 && (
        <div className="divide-y divide-hairline rounded-sm border border-hairline">
          {resolutions.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm text-ink-navy">{ACTION_LABELS[r.action] ?? r.action}</p>
                {r.notes && <p className="mt-0.5 text-xs text-ink-navy-soft">{r.notes}</p>}
              </div>
              <StatusChip status={r.status} />
            </div>
          ))}
        </div>
      )}

      {canPropose && (
        <div className="rounded-sm border border-hairline p-4">
          <p className="mb-3 text-sm font-medium text-ink-navy">Propose a resolution</p>
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="action">Action</FieldLabel>
              <Select id="action" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="match">Manually match</option>
                <option value="write_off">Write off</option>
                <option value="escalate">Escalate</option>
                <option value="dismiss">Dismiss</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <p className="text-sm text-exception">{error}</p>}
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await proposeResolution({ orgId, exceptionId, action, notes });
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                })
              }
            >
              {isPending ? "Proposing..." : "Propose resolution"}
            </Button>
          </div>
        </div>
      )}

      {pending && !canDecide && (
        <p className="text-sm text-ink-navy-soft">
          Waiting on a checker to approve or reject this proposal.
          {pending.proposed_by === currentUserId && " A different person must review your own proposal."}
        </p>
      )}

      {canDecide && (
        <div className="flex gap-3">
          <Button
            variant="seal"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await decideResolution({ orgId, resolutionId: pending!.id, approve: true });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              })
            }
          >
            Approve and seal
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await decideResolution({ orgId, resolutionId: pending!.id, approve: false });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              })
            }
          >
            Reject
          </Button>
        </div>
      )}
      {error && !canPropose && <p className="text-sm text-exception">{error}</p>}
    </div>
  );
}
