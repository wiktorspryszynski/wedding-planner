"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { SubmitButton } from "@/components/client";
import { Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Login">
        <Input name="login" autoComplete="username" required autoFocus defaultValue={state?.login} />
      </Field>
      <Field label="Hasło">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton className="w-full">Zaloguj</SubmitButton>
    </form>
  );
}
