"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PAID_BY } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { int, oneOf, reqStr, str } from "@/lib/form";
import { parsePLN } from "@/lib/money";
import { done } from "@/lib/mutate";

const { budgetCategories, expenses, payments } = schema;

export async function saveCategory(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id");
  const v = { name: reqStr(fd, "name"), planned: parsePLN(fd.get("planned")) ?? 0 };
  const d = db();
  const row = id
    ? d.update(budgetCategories).set(v).where(eq(budgetCategories.id, id)).returning().get()
    : d.insert(budgetCategories).values({ ...v, sortOrder: 999 }).returning().get();
  done(user, "budget", id ? "update" : "create", `Kategoria budżetu: ${v.name}`, row?.id);
}

export async function deleteCategory(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const d = db();
  const used = d.select({ id: expenses.id }).from(expenses).where(eq(expenses.categoryId, id)).get();
  if (used) throw new Error("Kategoria ma wydatki — najpierw je usuń lub przenieś.");
  const c = d.delete(budgetCategories).where(eq(budgetCategories.id, id)).returning().get();
  if (c) done(user, "budget", "delete", `Usunięto kategorię: ${c.name}`, id);
}

export async function saveExpense(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id");
  const v = {
    categoryId: int(fd, "categoryId")!,
    vendorId: int(fd, "vendorId"),
    title: reqStr(fd, "title"),
    planned: parsePLN(fd.get("planned")) ?? 0,
    actual: parsePLN(fd.get("actual")),
    paidBy: oneOf(fd, "paidBy", PAID_BY, "us"),
    notes: str(fd, "notes"),
  };
  const d = db();
  const row = id
    ? d.update(expenses).set(v).where(eq(expenses.id, id)).returning().get()
    : d.insert(expenses).values(v).returning().get();
  done(user, "expense", id ? "update" : "create", `${id ? "Zmieniono" : "Dodano"} wydatek: ${v.title}`, row?.id);
}

export async function deleteExpense(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const e = db().delete(expenses).where(eq(expenses.id, id)).returning().get();
  if (e) done(user, "expense", "delete", `Usunięto wydatek: ${e.title}`, id);
}

export async function addPayment(fd: FormData) {
  const user = await requireUser();
  const amount = parsePLN(fd.get("amount"));
  if (!amount) throw new Error("Podaj kwotę płatności.");
  const v = {
    expenseId: int(fd, "expenseId")!,
    label: str(fd, "label"),
    amount,
    dueDate: str(fd, "dueDate"),
    paidAt: fd.get("paid") ? todayISO() : null,
  };
  const p = db().insert(payments).values(v).returning().get();
  done(user, "payment", "create", `Płatność ${v.label ?? ""} dodana`.replace(/\s+/g, " "), p.id);
}

export async function togglePaid(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const d = db();
  const p = d.select().from(payments).where(eq(payments.id, id)).get();
  if (!p) return;
  const paidAt = p.paidAt ? null : todayISO();
  d.update(payments).set({ paidAt }).where(eq(payments.id, id)).run();
  done(user, "payment", "update", `Płatność ${p.label ?? ""} ${paidAt ? "opłacona" : "cofnięta"}`.replace(/\s+/g, " "), id);
}

export async function deletePayment(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const p = db().delete(payments).where(eq(payments.id, id)).returning().get();
  if (p) done(user, "payment", "delete", `Usunięto płatność ${p.label ?? ""}`.trim(), id);
}
