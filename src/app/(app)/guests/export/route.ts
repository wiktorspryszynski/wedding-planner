import Papa from "papaparse";
import { requireUser } from "@/lib/auth";
import { GUEST_TYPE_LABEL, RSVP_LABEL, SIDE_LABEL } from "@/lib/labels";
import { loadGuests } from "../data";

export async function GET() {
  await requireUser();
  const rows = loadGuests().map((g) => ({
    Imię: g.firstName,
    Nazwisko: g.lastName,
    Strona: SIDE_LABEL[g.side],
    Zaproszenie: g.household ?? "",
    Typ: GUEST_TYPE_LABEL[g.type],
    RSVP: RSVP_LABEL[g.rsvp],
    Dieta: g.diet ?? "",
    Alergie: g.allergies ?? "",
    Nocleg: g.needsAccommodation ? "tak" : "nie",
    Telefon: g.phone ?? "",
    Stół: g.table ?? "",
    Tagi: g.tags.join(", "),
    Notatki: g.notes ?? "",
  }));
  // BOM so Excel opens Polish characters correctly.
  const csv = "\uFEFF" + Papa.unparse(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goscie.csv"`,
    },
  });
}
