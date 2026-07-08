"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerDetectionRun } from "@/app/actions/detection";
import { Button } from "@/components/ui/Button";

export function RunDetectionButton({ orgId, reconciliationSetId }: { orgId: string; reconciliationSetId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await triggerDetectionRun(orgId, reconciliationSetId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? "Running detection..." : "Run detection"}
      </Button>
      {error && <p className="mt-2 text-sm text-exception">{error}</p>}
    </div>
  );
}
