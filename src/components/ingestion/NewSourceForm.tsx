"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createDataSource, type CreateDataSourceState } from "@/app/actions/dataSources";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { CsvUploadWizard } from "./CsvUploadWizard";

const initialState: CreateDataSourceState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Continue"}
    </Button>
  );
}

export function NewSourceForm({ orgId }: { orgId: string }) {
  const [state, formAction] = useFormState(createDataSource, initialState);

  if (state.dataSourceId) {
    return (
      <div className="space-y-6">
        <div className="rounded-sm border border-hairline bg-paper-raised p-6">
          <CsvUploadWizard orgId={orgId} dataSourceId={state.dataSourceId} />
        </div>
        <Link href="/sources" className="text-sm text-trace hover:underline">
          Back to data sources
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-sm border border-hairline bg-paper-raised p-6">
      <input type="hidden" name="orgId" value={orgId} />
      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" name="name" placeholder="Chase business checking" required />
      </div>
      <div>
        <FieldLabel htmlFor="kind">Kind</FieldLabel>
        <Select id="kind" name="kind" defaultValue="transaction">
          <option value="transaction">Transaction feed (bank / processor)</option>
          <option value="ledger">Internal ledger</option>
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="origin">Origin</FieldLabel>
        <Select id="origin" name="origin" defaultValue="bank_feed">
          <option value="bank_feed">Bank feed</option>
          <option value="processor">Payment processor</option>
          <option value="ledger">Internal ledger</option>
          <option value="other">Other</option>
        </Select>
      </div>
      {state.error && <p className="text-sm text-exception">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
