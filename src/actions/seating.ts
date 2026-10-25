"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { guestName } from "@/lib/guests";
import { int, oneOf, reqStr } from "@/lib/form";
import { done, refreshAll } from "@/lib/mutate";

const { tables, guests } = schema;

export async function saveTable(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id");
  const v = {
    name: reqStr(fd, "name"),
    capacity: Math.max(1, int(fd, "capacity") ?? 8),
    shape: oneOf(fd, "shape", ["round", "rect"] as const, "round"),
  };
  const d = db();
  if (id) {
    d.update(tables).set(v).where(eq(tables.id, id)).run();
  } else {
    // Cascade new tables diagonally so they don't stack on top of each other.
    const n = d.select({ id: tables.id }).from(tables).all().length;
    d.insert(tables).values({ ...v, posX: 24 + (n % 5) * 210, posY: 24 + Math.floor(n / 5) * 230 }).run();
  }
  done(user, "table", id ? "update" : "create", `${id ? "Zmieniono" : "Dodano"} stół: ${v.name}`, id ?? undefined);
}

export async function deleteTable(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const t = db().delete(tables).where(eq(tables.id, id)).returning().get();
  if (t) done(user, "table", "delete", `Usunięto stół: ${t.name}`, id);
}

export async function moveTable(id: number, x: number, y: number) {
  await requireUser();
  db()
    .update(tables)
    .set({ posX: Math.max(0, Math.round(x)), posY: Math.max(0, Math.round(y)) })
    .where(eq(tables.id, id))
    .run();
  refreshAll();
}

export async function assignGuest(guestId: number, tableId: number | null) {
  const user = await requireUser();
  const d = db();
  const g = d.update(guests).set({ tableId }).where(eq(guests.id, guestId)).returning().get();
  if (!g) return;
  const t = tableId ? d.select().from(tables).where(eq(tables.id, tableId)).get() : null;
  done(user, "guest", "update", `${guestName(g)} → ${t ? t.name : "bez stołu"}`, guestId);
}

export async function assignGuestForm(fd: FormData) {
  const guestId = int(fd, "guestId");
  if (guestId) await assignGuest(guestId, int(fd, "tableId"));
}
