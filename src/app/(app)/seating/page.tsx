import type { Metadata } from "next";
import { Suspense } from "react";
import { assignGuestForm, deleteTable, saveTable } from "@/actions/seating";
import { AutoSelect, DeleteButton, SubmitButton } from "@/components/client";
import { Card, cx, Disclosure, Empty, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { loadGuests } from "../guests/data";
import { SeatingCanvas, type SeatGuest, type SeatTable } from "./canvas";

export const metadata: Metadata = { title: "Stoły" };

export default function SeatingPage() {
  return (
    <>
      <PageHeader title="Rozsadzenie" subtitle="Przeciągaj gości na stoły. Widoczni są wszyscy poza tymi, którzy odmówili." />
      <Suspense fallback={<Skeleton rows={4} />}>
        <Seating />
      </Suspense>
    </>
  );
}

async function Seating() {
  await requireUser();
  const tables: SeatTable[] = db().select().from(schema.tables).all();
  const guests: SeatGuest[] = loadGuests()
    .filter((g) => g.rsvp !== "no")
    .map((g) => ({
      id: g.id,
      name: `${g.firstName} ${g.lastName}`.trim(),
      household: g.household,
      tableId: g.tableId,
      flag: [g.diet, g.allergies].filter(Boolean).join(", ") || undefined,
    }));
  const unassigned = guests.filter((g) => g.tableId == null);
  const seats = tables.reduce((s, t) => s + t.capacity, 0);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-4">
        <Card className="flex-1">
          <Disclosure summary={<span className="text-sm font-medium text-accent">+ Dodaj stół</span>}>
            <TableForm defaultName={`Stół ${tables.length + 1}`} />
          </Disclosure>
        </Card>
        <p className="text-sm text-muted">
          {tables.length} stołów · {seats} miejsc · {guests.length - unassigned.length}/{guests.length} gości usadzonych
        </p>
      </div>

      {tables.length === 0 ? (
        <Empty>Dodaj pierwszy stół, potem przeciągaj na niego gości.</Empty>
      ) : (
        <>
          <div className="no-print">
            <SeatingCanvas tables={tables} guests={guests} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">Lista stołów</h2>
              <span className="no-print text-xs text-muted">Ctrl+P drukuje samą listę</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
              {tables.map((t) => {
                const at = guests.filter((g) => g.tableId === t.id);
                return (
                  <Card key={t.id} className="break-inside-avoid">
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-display text-lg">{t.name}</h3>
                      <span className={cx("text-xs", at.length > t.capacity ? "font-medium text-rose" : "text-muted")}>
                        {at.length}/{t.capacity}
                      </span>
                    </div>
                    <ol className="list-inside list-decimal space-y-0.5 text-sm">
                      {at.map((g) => (
                        <li key={g.id} className="flex items-center gap-2">
                          <span className="flex-1">
                            {g.name}
                            {g.flag && <span className="ml-1 text-xs text-rose">({g.flag})</span>}
                          </span>
                          <form action={assignGuestForm} className="no-print">
                            <input type="hidden" name="guestId" value={g.id} />
                            <button className="text-xs text-muted hover:text-danger" title="Zdejmij ze stołu">
                              ×
                            </button>
                          </form>
                        </li>
                      ))}
                    </ol>
                    {unassigned.length > 0 && (
                      <form action={assignGuestForm} className="no-print mt-3">
                        <input type="hidden" name="tableId" value={t.id} />
                        <AutoSelect name="guestId" defaultValue="" className="py-1 text-xs">
                          <option value="">+ dodaj gościa…</option>
                          {unassigned.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                              {g.household ? ` (${g.household})` : ""}
                            </option>
                          ))}
                        </AutoSelect>
                      </form>
                    )}
                    <Disclosure className="no-print mt-3" summary={<span className="text-xs text-muted">Edytuj stół</span>}>
                      <TableForm t={t} />
                      <div className="mt-2">
                        <DeleteButton action={deleteTable} id={t.id} confirm={`Usunąć ${t.name}? Goście wrócą na listę.`} />
                      </div>
                    </Disclosure>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TableForm({ t, defaultName }: { t?: SeatTable; defaultName?: string }) {
  return (
    <form action={saveTable} className="flex flex-wrap items-end gap-2">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Nazwa">
        <Input name="name" defaultValue={t?.name ?? defaultName} required className="w-36" />
      </Field>
      <Field label="Miejsca">
        <Input name="capacity" type="number" min={1} defaultValue={t?.capacity ?? 8} className="w-20" />
      </Field>
      <Field label="Kształt">
        <Select name="shape" defaultValue={t?.shape ?? "round"}>
          <option value="round">okrągły</option>
          <option value="rect">prostokątny</option>
        </Select>
      </Field>
      <SubmitButton variant={t ? "outline" : "primary"}>{t ? "Zapisz" : "Dodaj"}</SubmitButton>
    </form>
  );
}
