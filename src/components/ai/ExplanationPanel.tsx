"use client";

import { useState, useTransition } from "react";
import { requestExplanation } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";
import type { Explanation } from "@/types/database";

export function ExplanationPanel({
  orgId,
  exceptionId,
  initialExplanation,
}: {
  orgId: string;
  exceptionId: string;
  initialExplanation: Explanation | null;
}) {
  const [explanation, setExplanation] = useState(initialExplanation);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (explanation) {
    return (
      <div className="rounded-sm border-l-2 border-trace bg-trace-tint/40 p-4">
        <p className="text-sm text-ink-navy">{explanation.summary}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-trace">Grounded in</p>
        <p className="mt-1 text-xs text-ink-navy-soft">{explanation.grounded_rule}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-trace">Suggested resolution</p>
        <p className="mt-1 text-sm text-ink-navy">{explanation.suggested_resolution}</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-dashed border-hairline p-4">
      <p className="text-sm text-ink-navy-soft">
        Generate a plain-language explanation grounded in the exact flagged rows and rule above.
      </p>
      <Button
        variant="secondary"
        className="mt-3"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await requestExplanation(orgId, exceptionId);
            if (result.error) {
              setError(result.error);
              return;
            }
            if (result.explanation) setExplanation(result.explanation);
          })
        }
      >
        {isPending ? "Generating..." : "Generate explanation"}
      </Button>
      {error && <p className="mt-2 text-sm text-exception">{error}</p>}
    </div>
  );
}
