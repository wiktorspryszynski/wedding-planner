import type { Metadata } from "next";
import { Suspense } from "react";
import {
  addPayment,
  deleteCategory,
  deleteExpense,
  deletePayment,
  saveCategory,
  saveExpense,
  togglePaid,
} from "@/actions/budget";
import { DeleteButton, SubmitButton } from "@/components/client";
import {
  Badge,
  Button,
  Card,
  Check,
  cx,
  Disclosure,
  Field,
  Input,
  PageHeader,
  Progress,
  Select,
  Skeleton,
  Stat,
  Textarea,
} from "@/components/ui";
import { db, schema } from "@/db";
import { PAID_BY } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { loadBudget } from "@/lib/budget";
import { formatDate, todayISO } from "@/lib/dates";
import { PAID_BY_LABEL } from "@/lib/labels";
import { formatPLN, toInput } from "@/lib/money";

export const metadata: Metadata = { title: "Budżet" };

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budżet" subtitle="Plan, faktyczne koszty i harmonogram płatności." />
      <Suspense fallback={<Skeleton rows={6} />}>
        <Budget />
      </Suspense>
    </>
  );
}

type Data = ReturnType<typeof loadBudget>;
type Expense = Data["categories"][number]["expenses"][number];
type Vendor = { id: number; name: string };

async function Budget() {
  await requireUser();
  const b = loadBudget();
  const settings = db().select().from(schema.settings).get();
  const vendors = db().select({ id: schema.vendors.id, name: schema.vendors.name }).from(schema.vendors).all();
  const total = settings?.totalBudget || b.planned;
  const today = todayISO();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Budżet"
          value={formatPLN(total)}
          hint={settings?.totalBudget ? `w kategoriach: ${formatPLN(b.planned)}` : "suma planów kategorii"}
        />
        <Stat label="Koszty (faktyczne lub planowane)" value={formatPLN(b.cost)} hint={<Progress value={b.cost} max={total} tone={b.cost > total ? "rose" : "accent"} />} />
        <Stat label="Zapłacone" value={formatPLN(b.paid)} hint={<Progress value={b.paid} max={b.cost} tone="gold" />} />
        <Stat
          label={total - b.cost >= 0 ? "Zostaje w budżecie" : "Przekroczenie"}
          value={<span className={total - b.cost < 0 ? "text-danger" : ""}>{formatPLN(Math.abs(total - b.cost))}</span>}
          hint={`do zapłaty: ${formatPLN(b.cost - b.paid)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {b.categories.map((c) => (
            <Card key={c.id} flush>
              <Disclosure
                className="p-4"
                summary={
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg">{c.name}</h3>
                      <span className="text-sm tabular-nums">
                        <span className={c.planned && c.cost > c.planned ? "text-danger" : ""}>{formatPLN(c.cost)}</span>
                        <span className="text-muted"> / {c.planned ? formatPLN(c.planned) : "bez planu"}</span>
                      </span>
                    </div>
                    <Progress value={c.planned ? c.cost : 0} max={c.planned} tone={c.planned && c.cost > c.planned ? "rose" : "accent"} />
                    <div className="text-xs text-muted">
                      {c.expenses.length} wydatków · zapłacono {formatPLN(c.paid)}
                    </div>
                  </div>
                }
              >
                <div className="space-y-3">
                  {c.expenses.map((e) => (
                    <ExpenseItem key={e.id} e={e} categories={b.categories} vendors={vendors} today={today} />
                  ))}
                  <Disclosure summary={<span className="text-sm font-medium text-accent">+ Dodaj wydatek</span>}>
                    <ExpenseForm categoryId={c.id} categories={b.categories} vendors={vendors} />
                  </Disclosure>
                  <Disclosure summary={<span className="text-xs text-muted">Edytuj kategorię</span>}>
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={saveCategory} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <Field label="Nazwa">
                          <Input name="name" defaultValue={c.name} required />
                        </Field>
                        <Field label="Plan (zł)">
                          <Input name="planned" inputMode="decimal" defaultValue={toInput(c.planned)} className="w-32" />
                        </Field>
                        <SubmitButton variant="outline">Zapisz</SubmitButton>
                      </form>
                      {c.expenses.length === 0 && (
                        <DeleteButton action={deleteCategory} id={c.id} confirm={`Usunąć kategorię „${c.name}”?`} />
                      )}
                    </div>
                  </Disclosure>
                </div>
              </Disclosure>
            </Card>
          ))}
          <Card>
            <Disclosure summary={<span className="text-sm font-medium text-accent">+ Nowa kategoria</span>}>
              <form action={saveCategory} className="flex flex-wrap items-end gap-2">
                <Field label="Nazwa">
                  <Input name="name" required />
                </Field>
                <Field label="Plan (zł)">
                  <Input name="planned" inputMode="decimal" className="w-32" />
                </Field>
                <SubmitButton>Dodaj</SubmitButton>
              </form>
            </Disclosure>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-display text-lg">Najbliższe płatności</h3>
            {b.upcoming.length === 0 ? (
              <p className="text-sm text-muted">Brak zaplanowanych płatności.</p>
            ) : (
              <ul className="space-y-2">
                {b.upcoming.slice(0, 10).map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <div>{p.expense}</div>
                      <div className="text-xs text-muted">
                        {p.label ?? "płatność"} ·{" "}
                        <span className={p.dueDate && p.dueDate < today ? "text-danger" : ""}>{formatDate(p.dueDate)}</span>
                      </div>
                    </div>
                    <span className="tabular-nums">{formatPLN(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="mb-3 font-display text-lg">Kto płaci</h3>
            <ul className="space-y-3">
              {PAID_BY.filter((k) => b.byPayer[k]).map((k) => (
                <li key={k} className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{PAID_BY_LABEL[k]}</span>
                    <span className="tabular-nums">{formatPLN(b.byPayer[k])}</span>
                  </div>
                  <Progress value={b.byPayer[k]} max={b.cost} tone="gold" />
                </li>
              ))}
              {b.cost === 0 && <p className="text-sm text-muted">Jeszcze brak wydatków.</p>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ExpenseItem({ e, categories, vendors, today }: { e: Expense; categories: Data["categories"]; vendors: Vendor[]; today: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <Disclosure
        summary={
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{e.title}</span>
              {e.vendor && <Badge>{e.vendor}</Badge>}
              {e.paidBy !== "us" && <Badge tone="gold">{PAID_BY_LABEL[e.paidBy]}</Badge>}
              {e.actual == null && <Badge>szacunek</Badge>}
            </div>
            <span className="text-sm tabular-nums">
              {formatPLN(e.cost)}
              {e.paid > 0 && <span className="text-muted"> · zapł. {formatPLN(e.paid)}</span>}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted">Płatności / zaliczki</h4>
            <ul className="space-y-1.5">
              {e.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <form action={togglePaid}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      className={cx(
                        "size-5 rounded border text-xs leading-none",
                        p.paidAt ? "border-accent bg-accent text-accent-ink" : "border-line",
                      )}
                      title={p.paidAt ? "Cofnij" : "Oznacz jako zapłacone"}
                    >
                      {p.paidAt ? "✓" : ""}
                    </button>
                  </form>
                  <span className="tabular-nums">{formatPLN(p.amount)}</span>
                  <span className="text-muted">{p.label}</span>
                  <span className={cx("text-xs", !p.paidAt && p.dueDate && p.dueDate < today ? "text-danger" : "text-muted")}>
                    {p.paidAt ? `zapłacono ${formatDate(p.paidAt)}` : p.dueDate ? `termin ${formatDate(p.dueDate)}` : ""}
                  </span>
                  <span className="ml-auto">
                    <DeleteButton action={deletePayment} id={p.id} confirm="Usunąć płatność?">×</DeleteButton>
                  </span>
                </li>
              ))}
            </ul>
            <form action={addPayment} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="expenseId" value={e.id} />
              <Field label="Kwota (zł)">
                <Input name="amount" inputMode="decimal" className="w-28" required />
              </Field>
              <Field label="Opis">
                <Input name="label" placeholder="zaliczka" className="w-32" />
              </Field>
              <Field label="Termin">
                <Input name="dueDate" type="date" />
              </Field>
              <div className="pb-2">
                <Check name="paid" label="już zapłacone" />
              </div>
              <Button variant="outline" size="sm" className="mb-1">
                Dodaj płatność
              </Button>
            </form>
          </div>
          <hr className="border-line" />
          <ExpenseForm e={e} categoryId={e.categoryId} categories={categories} vendors={vendors} />
          <DeleteButton action={deleteExpense} id={e.id} confirm={`Usunąć wydatek „${e.title}” razem z płatnościami?`}>
            Usuń wydatek
          </DeleteButton>
        </div>
      </Disclosure>
    </div>
  );
}

function ExpenseForm({
  e,
  categoryId,
  categories,
  vendors,
}: {
  e?: Expense;
  categoryId: number;
  categories: Data["categories"];
  vendors: Vendor[];
}) {
  return (
    <form action={saveExpense} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {e && <input type="hidden" name="id" value={e.id} />}
      <Field label="Nazwa" className="col-span-2 sm:col-span-1">
        <Input name="title" defaultValue={e?.title} required />
      </Field>
      <Field label="Planowane (zł)">
        <Input name="planned" inputMode="decimal" defaultValue={toInput(e?.planned)} />
      </Field>
      <Field label="Faktyczne (zł)">
        <Input name="actual" inputMode="decimal" defaultValue={toInput(e?.actual)} placeholder="gdy znane" />
      </Field>
      <Field label="Kategoria">
        <Select name="categoryId" defaultValue={categoryId}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Usługodawca">
        <Select name="vendorId" defaultValue={e?.vendorId ?? ""}>
          <option value="">—</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Kto płaci">
        <Select name="paidBy" defaultValue={e?.paidBy ?? "us"}>
          {PAID_BY.map((p) => (
            <option key={p} value={p}>{PAID_BY_LABEL[p]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Notatki" className="col-span-2 sm:col-span-3">
        <Textarea name="notes" defaultValue={e?.notes ?? ""} />
      </Field>
      <div className="col-span-2 sm:col-span-3">
        <SubmitButton variant={e ? "outline" : "primary"}>{e ? "Zapisz wydatek" : "Dodaj wydatek"}</SubmitButton>
      </div>
    </form>
  );
}
