"use client";

import { useState, useTransition } from "react";
import { runNaturalLanguageQuery } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function QueryBox({ orgId, reconciliationSetId }: { orgId: string; reconciliationSetId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-sm border border-hairline bg-paper-raised p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-navy-soft">Ask about this set</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          startTransition(async () => {
            setError(null);
            setAnswer(null);
            const result = await runNaturalLanguageQuery(orgId, reconciliationSetId, question);
            if (result.error) {
              setError(result.error);
              return;
            }
            setAnswer(result.answer ?? null);
          });
        }}
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. show me unmatched payments over $1,000"
        />
        <Button type="submit" disabled={isPending || !question.trim()}>
          {isPending ? "Asking..." : "Ask"}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-exception">{error}</p>}
      {answer && (
        <div className="mt-3 rounded-sm border-l-2 border-trace bg-trace-tint/40 p-3 text-sm text-ink-navy">
          {answer}
        </div>
      )}
    </div>
  );
}
