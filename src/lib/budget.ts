import "server-only";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PAID_BY } from "@/db/schema";

const { budgetCategories, expenses, payments, vendors } = schema;

export function loadBudget() {
  const d = db();
  const cats = d.select().from(budgetCategories).orderBy(asc(budgetCategories.sortOrder), asc(budgetCategories.name)).all();
  const exps = d.select().from(expenses).orderBy(asc(expenses.createdAt)).all();
  const pays = d.select().from(payments).orderBy(asc(payments.dueDate)).all();
  const vendorNames = new Map(d.select({ id: vendors.id, name: vendors.name }).from(vendors).all().map((v) => [v.id, v.name]));

  const expenseRows = exps.map((e) => {
    const ps = pays.filter((p) => p.expenseId === e.id);
    const cost = e.actual ?? e.planned;
    const paid = ps.filter((p) => p.paidAt).reduce((s, p) => s + p.amount, 0);
    return { ...e, cost, paid, payments: ps, vendor: e.vendorId ? vendorNames.get(e.vendorId) : undefined };
  });

  const categories = cats.map((c) => {
    const items = expenseRows.filter((e) => e.categoryId === c.id);
    return {
      ...c,
      expenses: items,
      cost: items.reduce((s, e) => s + e.cost, 0),
      paid: items.reduce((s, e) => s + e.paid, 0),
    };
  });

  const byPayer = {} as Record<(typeof PAID_BY)[number], number>;
  for (const e of expenseRows) byPayer[e.paidBy] = (byPayer[e.paidBy] ?? 0) + e.cost;

  const expenseTitle = new Map(exps.map((e) => [e.id, e.title]));
  const upcoming = pays
    .filter((p) => !p.paidAt)
    .map((p) => ({ ...p, expense: expenseTitle.get(p.expenseId) ?? "" }))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  return {
    categories,
    byPayer,
    upcoming,
    planned: cats.reduce((s, c) => s + c.planned, 0),
    cost: expenseRows.reduce((s, e) => s + e.cost, 0),
    paid: expenseRows.reduce((s, e) => s + e.paid, 0),
  };
}
