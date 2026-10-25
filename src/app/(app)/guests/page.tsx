import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteGuest, saveHousehold, setRsvp } from "@/actions/guests";
import { AutoSelect, DeleteButton, SubmitButton } from "@/components/client";
import { Badge, Button, Card, Disclosure, Empty, Field, Input, PageHeader, Select, Skeleton, Stat } from "@/components/ui";
import { db, schema } from "@/db";
import { RSVP, SIDES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { GUEST_TYPE_LABEL, RSVP_LABEL, SIDE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { formatPLN } from "@/lib/money";
import { loadGuests, type GuestRow } from "./data";
import { GuestForm } from "./guest-form";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Goście" };

const RSVP_TONE = { yes: "green", no: "rose", maybe: "gold", pending: "neutral" } as const;

export default function GuestsPage(props: PageProps<"/guests">) {
  return (
    <>
      <PageHeader
        title="Goście"
        subtitle="Lista gości, potwierdzenia i zaproszenia."
        actions={
          <a href="/guests/export">
            <Button variant="outline">Eksport CSV</Button>
          </a>
        }
      />
      <Suspense fallback={<Skeleton rows={5} />}>
        <Guests searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

type Filters = { q?: string; side?: string; rsvp?: string; tag?: string; flag?: string };

function matches(g: GuestRow, f: Filters) {
  if (f.q) {
    const hay = `${g.firstName} ${g.lastName} ${g.household ?? ""}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  if (f.side && g.side !== f.side) return false;
  if (f.rsvp && g.rsvp !== f.rsvp) return false;
  if (f.tag && !g.tags.includes(f.tag)) return false;
  if (f.flag === "diet" && !g.diet && !g.allergies) return false;
  if (f.flag === "accommodation" && !g.needsAccommodation) return false;
  if (f.flag === "transport" && !g.needsTransport) return false;
  if (f.flag === "noTable" && (g.tableId || g.rsvp === "no")) return false;
  return true;
}

async function Guests({ searchParams }: { searchParams: PageProps<"/guests">["searchParams"] }) {
  await requireUser();
  const sp = await searchParams;
  const f: Filters = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v),
  );
  const all = loadGuests();
  const list = all.filter((g) => matches(g, f));
  const settings = db().select().from(schema.settings).get();
  const households = [...new Set(all.map((g) => g.household).filter((h): h is string => !!h))];
  const tags = [...new Set(all.flatMap((g) => g.tags))].sort();

  const count = (pred: (g: GuestRow) => boolean) => all.filter(pred).length;
  const attending = count((g) => g.rsvp !== "no");
  const confirmed = count((g) => g.rsvp === "yes");

  // Group by household, keeping guests without one at the end.
  const groups = new Map<string, GuestRow[]>();
  for (const g of list) {
    const key = g.household ?? "";
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "pl")));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Wszyscy" value={all.length} />
        <Stat label="Potwierdzeni" value={confirmed} />
        <Stat label="Czekamy" value={count((g) => g.rsvp === "pending" || g.rsvp === "maybe")} />
        <Stat label="Odmówili" value={count((g) => g.rsvp === "no")} />
        <Stat label="Dzieci" value={count((g) => g.type === "child" && g.rsvp !== "no")} />
        <Stat
          label="Koszt talerzyków"
          value={formatPLN(attending * (settings?.costPerGuest ?? 0))}
          hint={settings?.costPerGuest ? `${attending} os. × ${formatPLN(settings.costPerGuest)}` : "ustaw w Ustawieniach"}
        />
      </div>

      <Card>
        <Disclosure summary={<span className="text-sm font-medium text-accent">+ Dodaj gościa</span>}>
          <GuestForm households={households} />
        </Disclosure>
        <hr className="my-4 border-line" />
        <Disclosure summary={<span className="text-sm font-medium text-muted">Import z CSV</span>}>
          <ImportForm />
        </Disclosure>
      </Card>

      <form className="no-print flex flex-wrap gap-2">
        <Input name="q" defaultValue={f.q} placeholder="Szukaj…" className="max-w-48" />
        <Select name="side" defaultValue={f.side ?? ""} className="max-w-40">
          <option value="">Każda strona</option>
          {SIDES.map((s) => (
            <option key={s} value={s}>{SIDE_LABEL[s]}</option>
          ))}
        </Select>
        <Select name="rsvp" defaultValue={f.rsvp ?? ""} className="max-w-40">
          <option value="">Każde RSVP</option>
          {RSVP.map((r) => (
            <option key={r} value={r}>{RSVP_LABEL[r]}</option>
          ))}
        </Select>
        {tags.length > 0 && (
          <Select name="tag" defaultValue={f.tag ?? ""} className="max-w-36">
            <option value="">Każdy tag</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        )}
        <Select name="flag" defaultValue={f.flag ?? ""} className="max-w-44">
          <option value="">Bez filtra</option>
          <option value="diet">Dieta / alergie</option>
          <option value="accommodation">Potrzebny nocleg</option>
          <option value="transport">Potrzebny transport</option>
          <option value="noTable">Bez stołu</option>
        </Select>
        <Button variant="outline">Filtruj</Button>
        {Object.keys(f).length > 0 && (
          <a href="/guests" className="self-center text-sm text-muted underline">
            wyczyść
          </a>
        )}
      </form>

      {list.length === 0 ? (
        <Empty>{all.length === 0 ? "Nie ma jeszcze gości. Dodaj pierwszego albo zaimportuj CSV." : "Nic nie pasuje do filtrów."}</Empty>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Pokazano {list.length} z {all.length}</p>
          {ordered.map(([household, guests]) => (
            <Card key={household || "-"} flush>
              <HouseholdHeader name={household} guests={guests} />
              <ul className="divide-y divide-line">
                {guests.map((g) => (
                  <GuestItem key={g.id} g={g} households={households} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestItem({ g, households }: { g: GuestRow; households: string[] }) {
  return (
    <li className="px-4 py-3">
      <Disclosure
        summary={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">
              {g.firstName} {g.lastName}
            </span>
            <Badge>{SIDE_LABEL[g.side]}</Badge>
            {g.type !== "adult" && <Badge tone="gold">{GUEST_TYPE_LABEL[g.type]}</Badge>}
            {(g.diet || g.allergies) && <Badge tone="rose">{[g.diet, g.allergies].filter(Boolean).join(", ")}</Badge>}
            {g.needsAccommodation && <Badge>nocleg</Badge>}
            {g.needsTransport && <Badge>transport</Badge>}
            {g.table && <Badge tone="green">{g.table}</Badge>}
            {g.tags.map((t) => (
              <span key={t} className="text-xs text-muted">#{t}</span>
            ))}
            <span className="ml-auto">
              <Badge tone={RSVP_TONE[g.rsvp]}>{RSVP_LABEL[g.rsvp]}</Badge>
            </span>
          </div>
        }
      >
        <div className="space-y-4 rounded-xl bg-surface-2/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <form action={setRsvp} className="flex items-center gap-2">
              <input type="hidden" name="id" value={g.id} />
              <span className="text-xs text-muted">Szybkie RSVP</span>
              <AutoSelect name="rsvp" defaultValue={g.rsvp} className="w-28">
                {RSVP.map((r) => (
                  <option key={r} value={r}>{RSVP_LABEL[r]}</option>
                ))}
              </AutoSelect>
            </form>
            <div className="ml-auto">
              <DeleteButton action={deleteGuest} id={g.id} confirm={`Usunąć ${g.firstName} ${g.lastName}?`} />
            </div>
          </div>
          <GuestForm g={{ ...g, tags: g.tags.join(", ") }} households={households} />
        </div>
      </Disclosure>
    </li>
  );
}

function HouseholdHeader({ name, guests }: { name: string; guests: GuestRow[] }) {
  const h = guests[0];
  const title = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 className="font-display text-lg">{name || "Bez zaproszenia"}</h3>
      <span className="text-xs text-muted">{guests.length} os.</span>
      {name && (
        <span className="ml-auto">
          {h.inviteSentAt ? (
            <Badge tone="green">zaproszenie wysłane {formatDate(h.inviteSentAt)}</Badge>
          ) : (
            <Badge>zaproszenie niewysłane</Badge>
          )}
        </span>
      )}
    </div>
  );
  if (!name || !h.householdId) return <div className="border-b border-line px-4 py-2.5">{title}</div>;
  return (
    <Disclosure className="border-b border-line px-4 py-2.5" summary={title}>
      <form action={saveHousehold} className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-4">
        <input type="hidden" name="id" value={h.householdId} />
        <Field label="Nazwa">
          <Input name="name" defaultValue={name} required />
        </Field>
        <Field label="Adres" className="sm:col-span-2">
          <Input name="address" defaultValue={h.householdAddress ?? ""} />
        </Field>
        <Field label="Zaproszenie wysłane">
          <Input name="inviteSentAt" type="date" defaultValue={h.inviteSentAt ?? ""} />
        </Field>
        <Field label="Notatki" className="col-span-2 sm:col-span-3">
          <Input name="notes" defaultValue={h.householdNotes ?? ""} />
        </Field>
        <div className="flex items-end">
          <SubmitButton variant="outline">Zapisz</SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}
