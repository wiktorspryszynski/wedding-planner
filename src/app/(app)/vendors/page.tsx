import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteVendor, saveVendor, setVendorStatus } from "@/actions/vendors";
import { AutoSelect, DeleteButton, SubmitButton } from "@/components/client";
import { Badge, Card, Disclosure, Empty, Field, Input, PageHeader, Select, Skeleton, Textarea } from "@/components/ui";
import { db, schema } from "@/db";
import { VENDOR_STATUS } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { VENDOR_STATUS_LABEL } from "@/lib/labels";
import { formatPLN, toInput } from "@/lib/money";

export const metadata: Metadata = { title: "Usługodawcy" };

const CATEGORIES = [
  "Sala",
  "Catering",
  "Fotograf",
  "Kamerzysta",
  "DJ / zespół",
  "Florystka / dekoracje",
  "Tort",
  "Suknia",
  "Garnitur",
  "Fryzjer / makijaż",
  "Transport",
  "Noclegi",
  "Obrączki",
  "Papeteria",
  "Inne",
];

const STATUS_TONE = { research: "neutral", contacted: "neutral", offer: "gold", booked: "green", rejected: "rose" } as const;

type Vendor = typeof schema.vendors.$inferSelect;

export default function VendorsPage() {
  return (
    <>
      <PageHeader title="Usługodawcy" subtitle="Sala, fotograf, muzyka… — kontakty, oferty i umowy." />
      <Suspense fallback={<Skeleton rows={4} />}>
        <Vendors />
      </Suspense>
    </>
  );
}

async function Vendors() {
  await requireUser();
  const d = db();
  const vendors = d.select().from(schema.vendors).all();
  const expenses = d.select().from(schema.expenses).all();
  const tasks = d.select().from(schema.tasks).all();
  const costOf = (id: number) =>
    expenses.filter((e) => e.vendorId === id).reduce((s, e) => s + (e.actual ?? e.planned), 0);
  const openTasks = (id: number) => tasks.filter((t) => t.vendorId === id && t.status !== "done").length;

  return (
    <div className="space-y-6">
      <Card>
        <Disclosure summary={<span className="text-sm font-medium text-accent">+ Dodaj usługodawcę</span>}>
          <VendorForm />
        </Disclosure>
      </Card>
      {vendors.length === 0 ? (
        <Empty>Brak usługodawców. Dodaj pierwszego — np. salę, którą oglądacie.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {VENDOR_STATUS.map((status) => {
            const list = vendors.filter((v) => v.status === status).sort((a, b) => a.category.localeCompare(b.category, "pl"));
            if (list.length === 0) return null;
            return (
              <section key={status} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                  {VENDOR_STATUS_LABEL[status]} <span className="text-xs">({list.length})</span>
                </h2>
                {list.map((v) => (
                  <VendorCard key={v.id} v={v} cost={costOf(v.id)} openTasks={openTasks(v.id)} />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VendorCard({ v, cost, openTasks }: { v: Vendor; cost: number; openTasks: number }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted">{v.category}</div>
          <h3 className="font-display text-lg leading-tight">{v.name}</h3>
        </div>
        <Badge tone={STATUS_TONE[v.status]}>{VENDOR_STATUS_LABEL[v.status]}</Badge>
      </div>
      <div className="space-y-1 text-sm">
        {v.contactPerson && <div>{v.contactPerson}</div>}
        {v.phone && (
          <a className="block text-accent underline-offset-2 hover:underline" href={`tel:${v.phone}`}>
            {v.phone}
          </a>
        )}
        {v.email && (
          <a className="block text-accent underline-offset-2 hover:underline" href={`mailto:${v.email}`}>
            {v.email}
          </a>
        )}
        {v.website && (
          <a className="block truncate text-accent underline-offset-2 hover:underline" href={v.website} target="_blank" rel="noreferrer">
            {v.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {v.priceQuote != null && <Badge tone="gold">oferta {formatPLN(v.priceQuote)}</Badge>}
        {cost > 0 && <Badge>w budżecie {formatPLN(cost)}</Badge>}
        {v.contractSignedAt && <Badge tone="green">umowa {formatDate(v.contractSignedAt)}</Badge>}
        {openTasks > 0 && <Badge>{openTasks} zadań</Badge>}
      </div>
      {v.notes && <p className="text-sm whitespace-pre-line text-muted">{v.notes}</p>}
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <form action={setVendorStatus}>
          <input type="hidden" name="id" value={v.id} />
          <AutoSelect name="status" defaultValue={v.status} className="w-40 py-1 text-xs">
            {VENDOR_STATUS.map((s) => (
              <option key={s} value={s}>{VENDOR_STATUS_LABEL[s]}</option>
            ))}
          </AutoSelect>
        </form>
        <span className="ml-auto">
          <DeleteButton action={deleteVendor} id={v.id} confirm={`Usunąć ${v.name}?`} />
        </span>
      </div>
      <Disclosure summary={<span className="text-xs text-muted">Edytuj</span>}>
        <VendorForm v={v} />
      </Disclosure>
    </Card>
  );
}

function VendorForm({ v }: { v?: Vendor }) {
  return (
    <form action={saveVendor} className="grid grid-cols-2 gap-3">
      {v && <input type="hidden" name="id" value={v.id} />}
      <Field label="Kategoria">
        <Input name="category" list="vendor-categories" defaultValue={v?.category} required />
        <datalist id="vendor-categories">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Nazwa">
        <Input name="name" defaultValue={v?.name} required />
      </Field>
      <Field label="Osoba kontaktowa">
        <Input name="contactPerson" defaultValue={v?.contactPerson ?? ""} />
      </Field>
      <Field label="Telefon">
        <Input name="phone" type="tel" defaultValue={v?.phone ?? ""} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" defaultValue={v?.email ?? ""} />
      </Field>
      <Field label="Strona www">
        <Input name="website" defaultValue={v?.website ?? ""} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={v?.status ?? "research"}>
          {VENDOR_STATUS.map((s) => (
            <option key={s} value={s}>{VENDOR_STATUS_LABEL[s]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Oferta (zł)">
        <Input name="priceQuote" inputMode="decimal" defaultValue={toInput(v?.priceQuote)} />
      </Field>
      <Field label="Umowa podpisana">
        <Input name="contractSignedAt" type="date" defaultValue={v?.contractSignedAt ?? ""} />
      </Field>
      <Field label="Notatki" className="col-span-2">
        <Textarea name="notes" rows={3} defaultValue={v?.notes ?? ""} />
      </Field>
      <div className="col-span-2">
        <SubmitButton variant={v ? "outline" : "primary"}>{v ? "Zapisz" : "Dodaj"}</SubmitButton>
      </div>
    </form>
  );
}
