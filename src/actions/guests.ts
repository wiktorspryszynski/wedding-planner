"use server";

import { eq, inArray } from "drizzle-orm";
import Papa from "papaparse";
import { db, schema, type DB } from "@/db";
import { GUEST_TYPES, RSVP, SIDES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { bool, int, oneOf, reqStr, str } from "@/lib/form";
import { RSVP_LABEL } from "@/lib/labels";
import { done } from "@/lib/mutate";

const { guests, households, guestTags, guestTagLinks } = schema;

// Works for both the db handle and a transaction.
type Q = Pick<DB, "select" | "selectDistinct" | "insert" | "update" | "delete">;

function householdId(d: Q, name: string | null): number | null {
  if (!name) return null;
  const existing = d.select({ id: households.id }).from(households).where(eq(households.name, name)).get();
  if (existing) return existing.id;
  return d.insert(households).values({ name }).returning({ id: households.id }).get().id;
}

function setTags(d: Q, guestId: number, raw: string | null) {
  d.delete(guestTagLinks).where(eq(guestTagLinks.guestId, guestId)).run();
  const names = [...new Set((raw ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  for (const name of names) {
    d.insert(guestTags).values({ name }).onConflictDoNothing().run();
    const tag = d.select({ id: guestTags.id }).from(guestTags).where(eq(guestTags.name, name)).get()!;
    d.insert(guestTagLinks).values({ guestId, tagId: tag.id }).run();
  }
}

/** Drops households and tags nobody points at any more. */
function prune(d: Q) {
  const usedH = d.selectDistinct({ id: guests.householdId }).from(guests).all().map((r) => r.id).filter((x) => x != null);
  const allH = d.select({ id: households.id }).from(households).all().map((r) => r.id);
  const orphanH = allH.filter((id) => !usedH.includes(id));
  if (orphanH.length) d.delete(households).where(inArray(households.id, orphanH)).run();

  const usedT = d.selectDistinct({ id: guestTagLinks.tagId }).from(guestTagLinks).all().map((r) => r.id);
  const allT = d.select({ id: guestTags.id }).from(guestTags).all().map((r) => r.id);
  const orphanT = allT.filter((id) => !usedT.includes(id));
  if (orphanT.length) d.delete(guestTags).where(inArray(guestTags.id, orphanT)).run();
}

function values(fd: FormData, d: Q) {
  return {
    firstName: reqStr(fd, "firstName"),
    lastName: str(fd, "lastName") ?? "",
    side: oneOf(fd, "side", SIDES, "both"),
    type: oneOf(fd, "type", GUEST_TYPES, "adult"),
    rsvp: oneOf(fd, "rsvp", RSVP, "pending"),
    diet: str(fd, "diet"),
    allergies: str(fd, "allergies"),
    needsAccommodation: bool(fd, "needsAccommodation"),
    needsTransport: bool(fd, "needsTransport"),
    phone: str(fd, "phone"),
    notes: str(fd, "notes"),
    householdId: householdId(d, str(fd, "household")),
  };
}

export async function saveGuest(fd: FormData) {
  const user = await requireUser();
  const d = db();
  const id = int(fd, "id");
  const v = values(fd, d);
  const guestId = d.transaction((tx) => {
    const gid = id
      ? (tx.update(guests).set(v).where(eq(guests.id, id)).run(), id)
      : tx.insert(guests).values(v).returning({ id: guests.id }).get().id;
    setTags(tx, gid, str(fd, "tags"));
    prune(tx);
    return gid;
  });
  done(user, "guest", id ? "update" : "create", `${id ? "Zmieniono" : "Dodano"} gościa: ${v.firstName} ${v.lastName}`, guestId);
}

export async function setRsvp(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const rsvp = oneOf(fd, "rsvp", RSVP, "pending");
  const g = db().update(guests).set({ rsvp }).where(eq(guests.id, id)).returning().get();
  done(user, "guest", "update", `RSVP ${g.firstName} ${g.lastName}: ${RSVP_LABEL[rsvp]}`, id);
}

export async function deleteGuest(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const d = db();
  const g = d.delete(guests).where(eq(guests.id, id)).returning().get();
  if (!g) return;
  prune(d);
  done(user, "guest", "delete", `Usunięto gościa: ${g.firstName} ${g.lastName}`, id);
}

export async function saveHousehold(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const h = db()
    .update(households)
    .set({
      name: reqStr(fd, "name"),
      address: str(fd, "address"),
      inviteSentAt: str(fd, "inviteSentAt"),
      notes: str(fd, "notes"),
    })
    .where(eq(households.id, id))
    .returning()
    .get();
  done(user, "household", "update", `Zmieniono zaproszenie: ${h.name}`, id);
}

// --- CSV import -----------------------------------------------------------

const MAP: Record<string, string> = {
  imię: "firstName", imie: "firstName", first_name: "firstName", firstname: "firstName",
  nazwisko: "lastName", last_name: "lastName", lastname: "lastName",
  strona: "side", side: "side",
  zaproszenie: "household", rodzina: "household", household: "household",
  typ: "type", type: "type",
  rsvp: "rsvp", potwierdzenie: "rsvp",
  dieta: "diet", diet: "diet",
  alergie: "allergies", allergies: "allergies",
  nocleg: "needsAccommodation", accommodation: "needsAccommodation",
  transport: "needsTransport",
  telefon: "phone", phone: "phone",
  tagi: "tags", tags: "tags",
  notatki: "notes", uwagi: "notes", notes: "notes",
};

const SIDE_IN: Record<string, (typeof SIDES)[number]> = {
  pm: "bride", "panna młoda": "bride", panna: "bride", bride: "bride",
  pan: "groom", "pan młody": "groom", groom: "groom",
  wspólni: "both", wspolni: "both", oboje: "both", both: "both",
};
const RSVP_IN: Record<string, (typeof RSVP)[number]> = {
  tak: "yes", yes: "yes", nie: "no", no: "no", może: "maybe", moze: "maybe", maybe: "maybe",
};
const TYPE_IN: Record<string, (typeof GUEST_TYPES)[number]> = {
  dziecko: "child", child: "child", "osoba tow.": "plus_one", "osoba towarzysząca": "plus_one", plus_one: "plus_one",
};
const yes = (v: string) => ["tak", "yes", "1", "x", "true"].includes(v.toLowerCase());

export async function importGuests(_prev: string | null, fd: FormData): Promise<string> {
  const user = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return "Wybierz plik CSV.";
  const text = (await file.text()).replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => MAP[h.trim().toLowerCase()] ?? h.trim(),
  });
  const rows = parsed.data.filter((r) => r.firstName?.trim());
  if (rows.length === 0) return "Brak wierszy z kolumną „Imię”.";

  const d = db();
  d.transaction((tx) => {
    const t = tx;
    for (const r of rows) {
      const low = (k: string) => (r[k] ?? "").trim().toLowerCase();
      const gid = t
        .insert(guests)
        .values({
          firstName: r.firstName.trim(),
          lastName: (r.lastName ?? "").trim(),
          side: SIDE_IN[low("side")] ?? "both",
          type: TYPE_IN[low("type")] ?? "adult",
          rsvp: RSVP_IN[low("rsvp")] ?? "pending",
          diet: r.diet?.trim() || null,
          allergies: r.allergies?.trim() || null,
          needsAccommodation: yes(low("needsAccommodation")),
          needsTransport: yes(low("needsTransport")),
          phone: r.phone?.trim() || null,
          notes: r.notes?.trim() || null,
          householdId: householdId(t, r.household?.trim() || null),
        })
        .returning({ id: guests.id })
        .get().id;
      setTags(t, gid, r.tags ?? null);
    }
  });
  done(user, "guest", "create", `Zaimportowano ${rows.length} gości z CSV`);
  return `Zaimportowano ${rows.length} gości.`;
}
