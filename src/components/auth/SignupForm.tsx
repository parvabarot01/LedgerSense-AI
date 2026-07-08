"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signUp, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Input";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <FieldLabel htmlFor="email">Work email</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && <p className="text-sm text-exception">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
