import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, cx, Progress, Skeleton } from "@/components/ui";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { loadBudget } from "@/lib/budget";
import { addDaysISO, daysUntil, formatDate, todayISO } from "@/lib/dates";
import { formatPLN } from "@/lib/money";

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton rows={5} />}>
      <Dashboard />
    </Suspense>
  );
}

const REL = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });

function ago(date: Date) {
  const min = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(min) < 60) return REL.format(min, "minute");
  if (Math.abs(min) < 60 * 24) return REL.format(Math.round(min / 60), "hour");
  return REL.format(Math.round(min / 1440), "day");
}

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

async function Dashboard() {
  const me = await requireUser();
  const d = db();
  const settings = d.select().from(schema.settings).get();
  const guests = d.select().from(schema.guests).all();
  const budget = loadBudget();
  const today = todayISO();
  const horizon = addDaysISO(today, 14);
  const tasks = d.select().from(schema.tasks).all();
  const activity = d
    .select({ a: schema.activityLog, user: schema.users.name })
    .from(schema.activityLog)
    .leftJoin(schema.users, eq(schema.activityLog.userId, schema.users.id))
    .orderBy(desc(schema.activityLog.id))
    .limit(12)
    .all();

  const days = settings?.weddingDate ? daysUntil(settings.weddingDate) : null;
  const rsvp = {
    yes: guests.filter((g) => g.rsvp === "yes").length,
    maybe: guests.filter((g) => g.rsvp === "maybe").length,
    pending: guests.filter((g) => g.rsvp === "pending").length,
    no: guests.filter((g) => g.rsvp === "no").length,
  };
  const attending = guests.filter((g) => g.rsvp !== "no");
  const diets = attending.filter((g) => g.diet || g.allergies).length;
  const unseated = attending.filter((g) => !g.tableId).length;
  const total = settings?.totalBudget || budget.planned;

  const dueTasks = tasks
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate <= horizon)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const duePayments = budget.upcoming.filter((p) => p.dueDate && p.dueDate <= horizon);
  const tasksDone = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-accent px-6 py-8 text-accent-ink sm:px-10 sm:py-12">
        <div className="relative z-10">
          <p className="text-sm opacity-80">Cześć, {me.name}</p>
          {days == null ? (
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">
              Ustalcie datę —{" "}
              <Link href="/settings" className="underline decoration-1 underline-offset-4">
                ustawienia
              </Link>
            </h1>
          ) : days === 0 ? (
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">To już dziś!</h1>
          ) : days > 0 ? (
            <>
              <h1 className="mt-2 font-display text-6xl leading-none sm:text-7xl">{days}</h1>
              <p className="mt-2 text-lg opacity-90">
                {plural(days, "dzień", "dni", "dni")} do ślubu · {formatDate(settings!.weddingDate)}
                {settings?.venue && ` · ${settings.venue}`}
              </p>
            </>
          ) : (
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">Po ślubie — gratulacje!</h1>
          )}
        </div>
        <svg className="absolute -right-10 -bottom-16 size-72 opacity-15" viewBox="0 0 100 100" aria-hidden>
          <circle cx="38" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="62" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle href="/guests">Goście</CardTitle>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl">{rsvp.yes}</span>
            <span className="text-sm text-muted">potwierdzonych z {guests.length}</span>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
            {(
              [
                ["yes", "bg-accent"],
                ["maybe", "bg-gold"],
                ["no", "bg-rose"],
              ] as const
            ).map(([k, c]) => (
              <div key={k} className={c} style={{ width: `${guests.length ? (rsvp[k] / guests.length) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <Legend color="bg-accent">tak {rsvp.yes}</Legend>
            <Legend color="bg-gold">może {rsvp.maybe}</Legend>
            <Legend color="bg-surface-2">czeka {rsvp.pending}</Legend>
            <Legend color="bg-rose">nie {rsvp.no}</Legend>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {diets > 0 && <Badge tone="rose">{diets} z dietą/alergią</Badge>}
            {unseated > 0 && <Badge>{unseated} bez stołu</Badge>}
          </div>
        </Card>

        <Card>
          <CardTitle href="/budget">Budżet</CardTitle>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl">{formatPLN(budget.cost)}</span>
            <span className="text-sm text-muted">z {formatPLN(total)}</span>
          </div>
          <div className="mt-3 space-y-2 text-xs text-muted">
            <Progress value={budget.cost} max={total} tone={budget.cost > total ? "rose" : "accent"} />
            <div className="flex justify-between">
              <span>zapłacone {formatPLN(budget.paid)}</span>
              <span>do zapłaty {formatPLN(budget.cost - budget.paid)}</span>
            </div>
            <Progress value={budget.paid} max={budget.cost} tone="gold" />
          </div>
        </Card>

        <Card>
          <CardTitle href="/tasks">Zadania</CardTitle>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl">{tasksDone}</span>
            <span className="text-sm text-muted">z {tasks.length} zrobionych</span>
          </div>
          <div className="mt-3">
            <Progress value={tasksDone} max={tasks.length} />
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-2">
          <h2 className="mb-3 font-display text-lg">Najbliższe 14 dni</h2>
          {dueTasks.length === 0 && duePayments.length === 0 ? (
            <p className="text-sm text-muted">Nic pilnego. 🎉</p>
          ) : (
            <ul className="divide-y divide-line">
              {duePayments.map((p) => (
                <DueItem key={`p${p.id}`} date={p.dueDate!} today={today} href="/budget">
                  <Badge tone="gold">płatność</Badge> {p.expense} {p.label && `· ${p.label}`}
                  <span className="ml-auto tabular-nums">{formatPLN(p.amount)}</span>
                </DueItem>
              ))}
              {dueTasks.map((t) => (
                <DueItem key={`t${t.id}`} date={t.dueDate!} today={today} href="/tasks">
                  <Badge tone="green">zadanie</Badge> {t.title}
                </DueItem>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg">Ostatnie zmiany</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Jeszcze nic.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map(({ a, user }) => (
                <li key={a.id}>
                  <span>{a.summary}</span>
                  <div className="text-xs text-muted">
                    {user ?? "?"} · {ago(a.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function CardTitle({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="mb-2 flex items-center justify-between text-sm text-muted hover:text-ink">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

function Legend({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx("size-2 rounded-full border border-line", color)} />
      {children}
    </span>
  );
}

function DueItem({ date, today, href, children }: { date: string; today: string; href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex flex-wrap items-center gap-2 py-2 text-sm hover:text-accent">
        <span className={cx("w-24 shrink-0 text-xs", date < today ? "font-medium text-danger" : "text-muted")}>
          {date < today ? "zaległe" : formatDate(date)}
        </span>
        {children}
      </Link>
    </li>
  );
}
