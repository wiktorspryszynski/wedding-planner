"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { VENDOR_STATUS } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { int, oneOf, reqStr, str } from "@/lib/form";
import { VENDOR_STATUS_LABEL } from "@/lib/labels";
import { parsePLN } from "@/lib/money";
import { done } from "@/lib/mutate";

const { vendors } = schema;

export async function saveVendor(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id");
  const website = str(fd, "website");
  const v = {
    category: reqStr(fd, "category"),
    name: reqStr(fd, "name"),
    contactPerson: str(fd, "contactPerson"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    website: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
    status: oneOf(fd, "status", VENDOR_STATUS, "research"),
    priceQuote: parsePLN(fd.get("priceQuote")),
    contractSignedAt: str(fd, "contractSignedAt"),
    notes: str(fd, "notes"),
  };
  const d = db();
  const row = id
    ? d.update(vendors).set(v).where(eq(vendors.id, id)).returning().get()
    : d.insert(vendors).values(v).returning().get();
  done(user, "vendor", id ? "update" : "create", `${id ? "Zmieniono" : "Dodano"} usługodawcę: ${v.name}`, row?.id);
}

export async function setVendorStatus(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const status = oneOf(fd, "status", VENDOR_STATUS, "research");
  const v = db().update(vendors).set({ status }).where(eq(vendors.id, id)).returning().get();
  if (v) done(user, "vendor", "update", `${v.name}: ${VENDOR_STATUS_LABEL[status]}`, id);
}

export async function deleteVendor(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const v = db().delete(vendors).where(eq(vendors.id, id)).returning().get();
  if (v) done(user, "vendor", "delete", `Usunięto usługodawcę: ${v.name}`, id);
}
