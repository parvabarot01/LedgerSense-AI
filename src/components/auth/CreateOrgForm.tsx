"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createOrganization } from "@/app/actions/org";
import type { ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Input";

const initialState: ActionState = {};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating workspace..." : "Create workspace"}
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, formAction] = useFormState(createOrganization, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const slugField = form.elements.namedItem("slug") as HTMLInputElement;
        const nameField = form.elements.namedItem("name") as HTMLInputElement;
        if (!slugField.value) slugField.value = slugify(nameField.value);
      }}
    >
      <div>
        <FieldLabel htmlFor="name">Workspace name</FieldLabel>
        <Input id="name" name="name" placeholder="Acme Finance" required />
      </div>
      <div>
        <FieldLabel htmlFor="slug">Workspace URL</FieldLabel>
        <Input id="slug" name="slug" placeholder="acme-finance" pattern="[a-z0-9-]+" required />
      </div>
      {state.error && <p className="text-sm text-exception">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
