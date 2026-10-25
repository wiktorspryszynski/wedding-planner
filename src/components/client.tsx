"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, Select } from "./ui";

export function SubmitButton({ children, ...p }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...p}>
      {pending ? "Zapisuję…" : children}
    </Button>
  );
}

/** Small form that asks for confirmation before running a destructive server action. */
export function DeleteButton({
  action,
  id,
  confirm,
  children = "Usuń",
}: {
  action: (fd: FormData) => Promise<void>;
  id: number;
  confirm: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" size="sm">
        {children}
      </Button>
    </form>
  );
}

/** A <select> that submits its form on change — for one-click status updates. */
export function AutoSelect(props: ComponentProps<"select">) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
