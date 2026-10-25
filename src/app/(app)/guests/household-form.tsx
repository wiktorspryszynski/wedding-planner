"use client";

import { useActionState, useState } from "react";
import { addHousehold } from "@/actions/guests";
import { SubmitButton } from "@/components/client";
import { Button, Check, cx, Field, Input, Select } from "@/components/ui";
import { adaptLastName, suggestHousehold } from "@/lib/guests";
import { RSVP_LABEL, SIDE_LABEL } from "@/lib/labels";

type Row = { key: number; firstName: string; lastName: string; type: "adult" | "child" | "plus_one"; diet: string };

const TYPE_OPTIONS = [
  { value: "adult", label: "Dorosły" },
  { value: "child", label: "Dziecko" },
  { value: "plus_one", label: "Os. tow." },
] as const;

const SIDES = Object.keys(SIDE_LABEL) as (keyof typeof SIDE_LABEL)[];
const RSVP = Object.keys(RSVP_LABEL) as (keyof typeof RSVP_LABEL)[];

let nextKey = 0;
const row = (type: Row["type"] = "adult"): Row => ({ key: nextKey++, firstName: "", lastName: "", type, diet: "" });

const PRESETS = {
  "1 osoba": () => [row()],
  Para: () => [row(), row()],
  "Para z kimś": () => [row(), row("plus_one")],
  Rodzina: () => [row(), row(), row("child"), row("child")],
};

/**
 * Adds a whole invitation in one go. `household` pins the target (adding people to an existing
 * invitation from its header); otherwise the name is suggested from the people typed in.
 */
export function HouseholdForm({ households, household }: { households: string[]; household?: string }) {
  // Remounting the fields on success clears the rows; the message lives up here so it survives.
  const [round, setRound] = useState(0);
  const [message, action] = useActionState(async (prev: string | null, fd: FormData) => {
    const msg = await addHousehold(prev, fd);
    if (msg.startsWith("Dodano")) setRound((r) => r + 1);
    return msg;
  }, null);
  return (
    <form action={action} className="space-y-4">
      <Fields key={round} households={households} household={household} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{household ? "Dopisz do zaproszenia" : "Dodaj zaproszenie"}</SubmitButton>
        {message && <span className={cx("text-sm", message.startsWith("Dodano") ? "text-accent" : "text-danger")}>{message}</span>}
      </div>
    </form>
  );
}

function Fields({ households, household }: { households: string[]; household?: string }) {
  const [rows, setRows] = useState<Row[]>(() => (household ? [row()] : PRESETS.Para()));
  const [plusOne, setPlusOne] = useState(false);

  const familyLast = rows.find((r) => r.type !== "plus_one" && r.lastName.trim())?.lastName.trim() ?? "";
  const suggestion = suggestHousehold(
    rows.map((r) => ({ ...r, lastName: r.lastName || (r.type === "plus_one" ? "" : adaptLastName(familyLast, r.firstName)) })),
    plusOne,
  );
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <>
      {!household && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([label, make]) => (
            <Button key={label} type="button" variant="outline" size="sm" onClick={() => setRows(make())}>
              {label}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1fr_1fr_8rem_1fr_auto]">
            <Field label={i === 0 ? "Imię" : ""}>
              <Input name="person.firstName" value={r.firstName} onChange={(e) => update(r.key, { firstName: e.target.value })} required={i === 0} />
            </Field>
            <Field label={i === 0 ? "Nazwisko" : ""}>
              <Input
                name="person.lastName"
                value={r.lastName}
                placeholder={i > 0 && r.type !== "plus_one" ? adaptLastName(familyLast, r.firstName) : ""}
                onChange={(e) => update(r.key, { lastName: e.target.value })}
              />
            </Field>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className={cx("mb-1.5 sm:order-last", rows.length === 1 && "invisible")}
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              title="Usuń osobę"
            >
              ×
            </Button>
            <Field label={i === 0 ? "Typ" : ""}>
              <Select name="person.type" value={r.type} onChange={(e) => update(r.key, { type: e.target.value as Row["type"] })}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label={i === 0 ? "Dieta / alergie" : ""}>
              <Input name="person.diet" value={r.diet} onChange={(e) => update(r.key, { diet: e.target.value })} />
            </Field>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, row()])}>
            + osoba
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, row("child")])}>
            + dziecko
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, row("plus_one")])}>
            + z kimś (z imieniem)
          </Button>
          <Check name="plusOne" label="+1 (osoba towarzysząca, imię nieznane)" checked={plusOne} onChange={(e) => setPlusOne(e.target.checked)} />
        </div>
      </div>

      {household ? (
        <input type="hidden" name="household" value={household} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Nazwa zaproszenia" className="col-span-2">
            <Input name="household" list="households-add" placeholder={suggestion || "np. Kowalscy"} />
            <datalist id="households-add">
              {households.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </Field>
          <Field label="Strona">
            <Select name="side" defaultValue="both">
              {SIDES.map((s) => (
                <option key={s} value={s}>{SIDE_LABEL[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="RSVP">
            <Select name="rsvp" defaultValue="pending">
              {RSVP.map((r) => (
                <option key={r} value={r}>{RSVP_LABEL[r]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tagi (po przecinku)" className="col-span-2">
            <Input name="tags" placeholder="rodzina, praca, poprawiny" />
          </Field>
          <div className="col-span-2 flex items-end pb-2">
            <Check name="needsAccommodation" label="Potrzebują noclegu" />
          </div>
        </div>
      )}

      {!household && suggestion && <p className="text-xs text-muted">Bez nazwy zapiszemy jako „{suggestion}”.</p>}
    </>
  );
}
