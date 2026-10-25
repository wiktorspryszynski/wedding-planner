"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { TASK_STATUS } from "@/db/schema";
import { TASK_TEMPLATE } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { int, oneOf, reqStr, str } from "@/lib/form";
import { done } from "@/lib/mutate";

const { tasks } = schema;

export async function saveTask(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id");
  const v = {
    title: reqStr(fd, "title"),
    description: str(fd, "description"),
    dueDate: str(fd, "dueDate"),
    assigneeId: int(fd, "assigneeId"),
    vendorId: int(fd, "vendorId"),
    status: oneOf(fd, "status", TASK_STATUS, "todo"),
  };
  const d = db();
  const row = id
    ? d.update(tasks).set(v).where(eq(tasks.id, id)).returning().get()
    : d.insert(tasks).values(v).returning().get();
  done(user, "task", id ? "update" : "create", `${id ? "Zmieniono" : "Dodano"} zadanie: ${v.title}`, row?.id);
}

export async function toggleTask(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const d = db();
  const t = d.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!t) return;
  const status = t.status === "done" ? "todo" : "done";
  d.update(tasks).set({ status }).where(eq(tasks.id, id)).run();
  done(user, "task", "update", `${status === "done" ? "Zrobione" : "Wznowione"}: ${t.title}`, id);
}

export async function deleteTask(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "id")!;
  const t = db().delete(tasks).where(eq(tasks.id, id)).returning().get();
  if (t) done(user, "task", "delete", `Usunięto zadanie: ${t.title}`, id);
}

/** Adds the standard checklist with due dates counted back from the wedding date. */
export async function addTemplateTasks() {
  const user = await requireUser();
  const d = db();
  const date = d.select().from(schema.settings).get()?.weddingDate;
  if (!date) throw new Error("Najpierw ustaw datę ślubu w Ustawieniach.");
  const existing = new Set(d.select({ title: tasks.title }).from(tasks).all().map((t) => t.title));
  const today = todayISO();
  const rows = TASK_TEMPLATE.filter((t) => !existing.has(t.title)).map((t) => {
    const due = addDaysISO(date, -Math.round(t.monthsBefore * 30.4));
    return { title: t.title, dueDate: due < today ? today : due };
  });
  if (rows.length) d.insert(tasks).values(rows).run();
  done(user, "task", "create", `Dodano ${rows.length} zadań z typowej checklisty`);
}
