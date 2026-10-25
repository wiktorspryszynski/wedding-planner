import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { guests, households, tables, guestTags, guestTagLinks } = schema;

export function loadGuests() {
  const d = db();
  const rows = d
    .select({
      g: guests,
      household: households.name,
      householdAddress: households.address,
      householdNotes: households.notes,
      inviteSentAt: households.inviteSentAt,
      table: tables.name,
    })
    .from(guests)
    .leftJoin(households, eq(guests.householdId, households.id))
    .leftJoin(tables, eq(guests.tableId, tables.id))
    .orderBy(asc(households.name), asc(guests.id)) // within an invitation: order of entry
    .all();
  const links = d
    .select({ guestId: guestTagLinks.guestId, name: guestTags.name })
    .from(guestTagLinks)
    .innerJoin(guestTags, eq(guestTagLinks.tagId, guestTags.id))
    .all();
  const tagsBy = new Map<number, string[]>();
  for (const l of links) tagsBy.set(l.guestId, [...(tagsBy.get(l.guestId) ?? []), l.name]);
  return rows.map(({ g, ...rest }) => ({ ...g, ...rest, tags: tagsBy.get(g.id) ?? [] }));
}

export type GuestRow = ReturnType<typeof loadGuests>[number];
