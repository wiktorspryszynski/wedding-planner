import { connection } from "next/server";
import { db, schema } from "@/db";
import { daysUntil } from "@/lib/dates";
import { cx } from "./ui";

const LONG = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

function relative(days: number) {
  if (days > 1) return `za ${days} dni`;
  if (days === 1) return "jutro";
  if (days === 0) return "to już dziś!";
  const after = -days;
  if (after < 365) return after === 1 ? "dzień po ślubie" : `${after} dni po ślubie`;
  const years = Math.floor(after / 365);
  return `${years} ${plural(years, "rok", "lata", "lat")} po ślubie`;
}

/** Wedding date from Settings with a day count. Renders nothing until a date is set. Needs <Suspense>. */
export async function WeddingDate({ className }: { className?: string }) {
  await connection();
  const date = db().select({ d: schema.settings.weddingDate }).from(schema.settings).get()?.d;
  if (!date) return null;
  return (
    <span className={cx("text-xs text-muted", className)}>
      {LONG.format(new Date(date))} · <span className="text-ink">{relative(daysUntil(date))}</span>
    </span>
  );
}
