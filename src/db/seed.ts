import { budgetCategories, settings } from "./schema";
import type { DB } from "./index";

const DEFAULT_CATEGORIES = [
  "Sala i catering",
  "Alkohol i napoje",
  "Tort i słodki stół",
  "Fotograf",
  "Kamerzysta",
  "Muzyka (DJ / zespół)",
  "Ceremonia (kościół / USC)",
  "Strój panny młodej",
  "Strój pana młodego",
  "Obrączki",
  "Kwiaty i dekoracje",
  "Zaproszenia i papeteria",
  "Transport",
  "Noclegi dla gości",
  "Fryzura i makijaż",
  "Prezenty dla gości / rodziców",
  "Podróż poślubna",
  "Inne",
];

// Idempotent: only fills an empty database.
export function seedDefaults(db: DB) {
  db.insert(settings).values({ id: 1 }).onConflictDoNothing().run();
  const existing = db.select({ id: budgetCategories.id }).from(budgetCategories).limit(1).all();
  if (existing.length === 0) {
    db.insert(budgetCategories)
      .values(DEFAULT_CATEGORIES.map((name, i) => ({ name, sortOrder: i })))
      .run();
  }
}

// Typical Polish wedding checklist; offset = months before the wedding date.
export const TASK_TEMPLATE: { title: string; monthsBefore: number }[] = [
  { title: "Ustalić budżet i wstępną listę gości", monthsBefore: 15 },
  { title: "Wybrać datę i zarezerwować salę", monthsBefore: 14 },
  { title: "Zarezerwować termin w kościele / USC", monthsBefore: 12 },
  { title: "Zarezerwować fotografa", monthsBefore: 12 },
  { title: "Zarezerwować kamerzystę", monthsBefore: 11 },
  { title: "Zarezerwować DJ-a / zespół", monthsBefore: 11 },
  { title: "Wybrać świadków", monthsBefore: 10 },
  { title: "Suknia ślubna — przymiarki i zamówienie", monthsBefore: 9 },
  { title: "Florystka i dekoracje — wybór i umowa", monthsBefore: 8 },
  { title: "Zarezerwować noclegi dla gości", monthsBefore: 7 },
  { title: "Zamówić zaproszenia", monthsBefore: 6 },
  { title: "Garnitur pana młodego", monthsBefore: 5 },
  { title: "Kupić obrączki", monthsBefore: 4 },
  { title: "Zarezerwować transport", monthsBefore: 4 },
  { title: "Rozesłać zaproszenia", monthsBefore: 3 },
  { title: "Nauki przedmałżeńskie / dokumenty do USC", monthsBefore: 3 },
  { title: "Degustacja menu i ustalenie tortu", monthsBefore: 2 },
  { title: "Fryzura i makijaż — próba", monthsBefore: 2 },
  { title: "Zebrać potwierdzenia RSVP", monthsBefore: 1 },
  { title: "Plan rozsadzenia gości", monthsBefore: 1 },
  { title: "Harmonogram dnia dla usługodawców", monthsBefore: 0.5 },
  { title: "Rozliczyć ostatnie płatności", monthsBefore: 0.25 },
];
