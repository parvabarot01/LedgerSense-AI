"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createReconciliationSet, type CreateReconciliationSetState } from "@/app/actions/reconciliationSets";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import type { DataSource } from "@/types/database";

const initialState: CreateReconciliationSetState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create reconciliation set"}
    </Button>
  );
}

export function NewReconciliationSetForm({ orgId, sources }: { orgId: string; sources: DataSource[] }) {
  const [state, formAction] = useFormState(createReconciliationSet, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-sm border border-hairline bg-paper-raised p-6">
      <input type="hidden" name="orgId" value={orgId} />
      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" name="name" placeholder="Bank feed vs. internal ledger" required />
      </div>
      <div>
        <FieldLabel htmlFor="sourceAId">Source A</FieldLabel>
        <Select id="sourceAId" name="sourceAId" required defaultValue="">
          <option value="" disabled>
            Select a data source
          </option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="sourceBId">Source B</FieldLabel>
        <Select id="sourceBId" name="sourceBId" required defaultValue="">
          <option value="" disabled>
            Select a data source
          </option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="matchWindowDays">Match window (days)</FieldLabel>
          <Input id="matchWindowDays" name="matchWindowDays" type="number" min={0} max={90} defaultValue={3} />
        </div>
        <div>
          <FieldLabel htmlFor="amountTolerance">Amount tolerance (fraction)</FieldLabel>
          <Input
            id="amountTolerance"
            name="amountTolerance"
            type="number"
            step="0.01"
            min={0}
            max={1}
            defaultValue={0}
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-exception">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
