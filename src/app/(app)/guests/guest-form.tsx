import { saveGuest } from "@/actions/guests";
import { SubmitButton } from "@/components/client";
import { Check, Field, Input, Select, Textarea } from "@/components/ui";
import { GUEST_TYPES, RSVP, SIDES } from "@/db/schema";
import { GUEST_TYPE_LABEL, RSVP_LABEL, SIDE_LABEL } from "@/lib/labels";

export type GuestFormValues = {
  id?: number;
  firstName?: string;
  lastName?: string;
  side?: (typeof SIDES)[number];
  type?: (typeof GUEST_TYPES)[number];
  rsvp?: (typeof RSVP)[number];
  diet?: string | null;
  allergies?: string | null;
  needsAccommodation?: boolean;
  needsTransport?: boolean;
  phone?: string | null;
  notes?: string | null;
  household?: string | null;
  tags?: string;
};

export function GuestForm({ g = {}, households }: { g?: GuestFormValues; households: string[] }) {
  const listId = `households-${g.id ?? "new"}`;
  return (
    <form action={saveGuest} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {g.id && <input type="hidden" name="id" value={g.id} />}
      <Field label="Imię">
        <Input name="firstName" defaultValue={g.firstName} required />
      </Field>
      <Field label="Nazwisko">
        <Input name="lastName" defaultValue={g.lastName} />
      </Field>
      <Field label="Zaproszenie / rodzina" className="col-span-2">
        <Input name="household" list={listId} defaultValue={g.household ?? ""} placeholder="np. Kowalscy" />
        <datalist id={listId}>
          {households.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </Field>
      <Field label="Strona">
        <Select name="side" defaultValue={g.side ?? "both"}>
          {SIDES.map((s) => (
            <option key={s} value={s}>{SIDE_LABEL[s]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Typ">
        <Select name="type" defaultValue={g.type ?? "adult"}>
          {GUEST_TYPES.map((t) => (
            <option key={t} value={t}>{GUEST_TYPE_LABEL[t]}</option>
          ))}
        </Select>
      </Field>
      <Field label="RSVP">
        <Select name="rsvp" defaultValue={g.rsvp ?? "pending"}>
          {RSVP.map((r) => (
            <option key={r} value={r}>{RSVP_LABEL[r]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Telefon">
        <Input name="phone" type="tel" defaultValue={g.phone ?? ""} />
      </Field>
      <Field label="Dieta">
        <Input name="diet" defaultValue={g.diet ?? ""} placeholder="wege, bezglutenowa…" />
      </Field>
      <Field label="Alergie">
        <Input name="allergies" defaultValue={g.allergies ?? ""} />
      </Field>
      <Field label="Tagi (po przecinku)" className="col-span-2">
        <Input name="tags" defaultValue={g.tags ?? ""} placeholder="rodzina, praca, poprawiny" />
      </Field>
      <Field label="Notatki" className="col-span-2 sm:col-span-3">
        <Textarea name="notes" defaultValue={g.notes ?? ""} />
      </Field>
      <div className="col-span-2 flex flex-col justify-end gap-2 sm:col-span-1">
        <Check name="needsAccommodation" label="Nocleg" defaultChecked={g.needsAccommodation} />
        <Check name="needsTransport" label="Transport" defaultChecked={g.needsTransport} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <SubmitButton>{g.id ? "Zapisz zmiany" : "Dodaj gościa"}</SubmitButton>
      </div>
    </form>
  );
}
