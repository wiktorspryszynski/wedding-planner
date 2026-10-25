import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addTemplateTasks, deleteTask, saveTask, toggleTask } from "@/actions/tasks";
import { DeleteButton, SubmitButton } from "@/components/client";
import { Badge, Card, cx, Disclosure, Empty, Field, Input, PageHeader, Select, Skeleton, Textarea } from "@/components/ui";
import { db, schema } from "@/db";
import { TASK_STATUS } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addDaysISO, formatDate, todayISO } from "@/lib/dates";
import { TASK_STATUS_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Zadania" };

type Task = typeof schema.tasks.$inferSelect;
type Opt = { id: number; name: string };

export default function TasksPage(props: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader title="Zadania" subtitle="Checklista z terminami — kto, co i na kiedy." />
      <Suspense fallback={<Skeleton rows={6} />}>
        <Tasks searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Tasks({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const me = await requireUser();
  const sp = await searchParams;
  const who = sp.who === "me" ? "me" : "all";
  const d = db();
  const users = d.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).all();
  const vendors = d.select({ id: schema.vendors.id, name: schema.vendors.name }).from(schema.vendors).all();
  const settings = d.select().from(schema.settings).get();
  const all = d.select().from(schema.tasks).all();
  const list = all
    .filter((t) => who === "all" || t.assigneeId === me.id)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const today = todayISO();
  const in30 = addDaysISO(today, 30);
  const open = list.filter((t) => t.status !== "done");
  const groups: [string, Task[], string?][] = [
    ["Zaległe", open.filter((t) => t.dueDate && t.dueDate < today), "text-danger"],
    ["Najbliższe 30 dni", open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= in30)],
    ["Później", open.filter((t) => t.dueDate && t.dueDate > in30)],
    ["Bez terminu", open.filter((t) => !t.dueDate)],
    ["Zrobione", list.filter((t) => t.status === "done"), "text-muted"],
  ];
  const doneCount = all.filter((t) => t.status === "done").length;
  const names = new Map(users.map((u) => [u.id, u.name]));
  const vendorNames = new Map(vendors.map((v) => [v.id, v.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          {(["all", "me"] as const).map((w) => (
            <Link
              key={w}
              href={w === "all" ? "/tasks" : "/tasks?who=me"}
              className={cx("rounded-md px-3 py-1", who === w ? "bg-accent-soft text-accent" : "text-muted")}
            >
              {w === "all" ? "Wszystkie" : "Moje"}
            </Link>
          ))}
        </div>
        <span className="text-sm text-muted">
          {doneCount} / {all.length} zrobione
        </span>
        {settings?.weddingDate && (
          <form action={addTemplateTasks} className="ml-auto">
            <SubmitButton variant="outline" size="sm">
              + Typowa checklista ślubna
            </SubmitButton>
          </form>
        )}
      </div>

      <Card>
        <Disclosure summary={<span className="text-sm font-medium text-accent">+ Dodaj zadanie</span>}>
          <TaskForm users={users} vendors={vendors} />
        </Disclosure>
      </Card>

      {all.length === 0 ? (
        <Empty>
          Brak zadań.{" "}
          {settings?.weddingDate
            ? "Możesz dodać typową checklistę przyciskiem powyżej."
            : "Ustaw datę ślubu w Ustawieniach, żeby wygenerować typową checklistę."}
        </Empty>
      ) : (
        groups
          .filter(([, items]) => items.length > 0)
          .map(([title, items, tone]) => (
            <section key={title}>
              <h2 className={cx("mb-2 text-sm font-medium", tone ?? "text-ink")}>
                {title} <span className="text-xs text-muted">({items.length})</span>
              </h2>
              <Card flush>
                <ul className="divide-y divide-line">
                  {items.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                      <form action={toggleTask} className="pt-0.5">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          className={cx(
                            "size-5 rounded-full border text-xs leading-none",
                            t.status === "done" ? "border-accent bg-accent text-accent-ink" : "border-muted/50 hover:border-accent",
                          )}
                          title={t.status === "done" ? "Wznów" : "Oznacz jako zrobione"}
                        >
                          {t.status === "done" ? "✓" : ""}
                        </button>
                      </form>
                      <Disclosure
                        className="min-w-0 flex-1"
                        summary={
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={cx(t.status === "done" && "text-muted line-through")}>{t.title}</span>
                            {t.status === "doing" && <Badge tone="gold">w trakcie</Badge>}
                            {t.assigneeId && <Badge>{names.get(t.assigneeId)}</Badge>}
                            {t.vendorId && <Badge>{vendorNames.get(t.vendorId)}</Badge>}
                            {t.dueDate && <span className="ml-auto text-xs text-muted">{formatDate(t.dueDate)}</span>}
                          </div>
                        }
                      >
                        {t.description && <p className="mb-3 text-sm whitespace-pre-line text-muted">{t.description}</p>}
                        <TaskForm t={t} users={users} vendors={vendors} />
                        <div className="mt-2">
                          <DeleteButton action={deleteTask} id={t.id} confirm={`Usunąć „${t.title}”?`} />
                        </div>
                      </Disclosure>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))
      )}
    </div>
  );
}

function TaskForm({ t, users, vendors }: { t?: Task; users: Opt[]; vendors: Opt[] }) {
  return (
    <form action={saveTask} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Zadanie" className="col-span-2">
        <Input name="title" defaultValue={t?.title} required />
      </Field>
      <Field label="Termin">
        <Input name="dueDate" type="date" defaultValue={t?.dueDate ?? ""} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={t?.status ?? "todo"}>
          {TASK_STATUS.map((s) => (
            <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Kto">
        <Select name="assigneeId" defaultValue={t?.assigneeId ?? ""}>
          <option value="">Oboje</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Usługodawca">
        <Select name="vendorId" defaultValue={t?.vendorId ?? ""}>
          <option value="">—</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Opis" className="col-span-2">
        <Textarea name="description" defaultValue={t?.description ?? ""} />
      </Field>
      <div className="col-span-2 sm:col-span-4">
        <SubmitButton variant={t ? "outline" : "primary"}>{t ? "Zapisz" : "Dodaj zadanie"}</SubmitButton>
      </div>
    </form>
  );
}
