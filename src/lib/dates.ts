const DAY = 86_400_000;

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(iso: string) {
  return Math.round((Date.parse(iso) - Date.parse(todayISO())) / DAY);
}

export function addDaysISO(iso: string, days: number) {
  return new Date(Date.parse(iso) + days * DAY).toISOString().slice(0, 10);
}

const FMT = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string | null | undefined) {
  return iso ? FMT.format(new Date(iso)) : "—";
}
