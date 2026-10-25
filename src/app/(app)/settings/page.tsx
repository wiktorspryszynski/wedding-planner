import type { Metadata } from "next";
import { Suspense } from "react";
import { saveSettings } from "@/actions/settings";
import { SubmitButton } from "@/components/client";
import { Card, Field, Input, PageHeader, Skeleton } from "@/components/ui";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { toInput } from "@/lib/money";

export const metadata: Metadata = { title: "Ustawienia" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ustawienia" subtitle="Podstawowe informacje o ślubie." />
      <Suspense fallback={<Skeleton rows={2} />}>
        <SettingsForm />
      </Suspense>
    </>
  );
}

async function SettingsForm() {
  await requireUser();
  const s = db().select().from(schema.settings).get();
  return (
    <Card className="max-w-xl">
      <form action={saveSettings} className="grid gap-4 sm:grid-cols-2">
        <Field label="Data ślubu">
          <Input name="weddingDate" type="date" defaultValue={s?.weddingDate ?? ""} />
        </Field>
        <Field label="Miejsce">
          <Input name="venue" defaultValue={s?.venue ?? ""} />
        </Field>
        <Field label="Całkowity budżet (zł)">
          <Input name="totalBudget" inputMode="decimal" defaultValue={toInput(s?.totalBudget || null)} placeholder="suma kategorii" />
        </Field>
        <Field label="Koszt na gościa / talerzyk (zł)">
          <Input name="costPerGuest" inputMode="decimal" defaultValue={toInput(s?.costPerGuest || null)} />
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton>Zapisz</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
