"use client";

import { useActionState } from "react";
import { importGuests } from "@/actions/guests";
import { SubmitButton } from "@/components/client";
import { Input } from "@/components/ui";

export function ImportForm() {
  const [msg, action] = useActionState(importGuests, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-xs text-muted">
        Kolumny (nagłówki, wielkość liter bez znaczenia): <b>Imię</b>, Nazwisko, Strona (panna młoda / pan młody /
        wspólni), Zaproszenie, Typ (dorosły / dziecko / osoba tow.), RSVP (tak / nie / może), Dieta, Alergie, Nocleg
        (tak/nie), Telefon, Tagi, Notatki. Eksport z arkusza Google jako CSV działa od razu.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="file" name="file" accept=".csv,text/csv" className="max-w-xs" required />
        <SubmitButton variant="outline">Importuj</SubmitButton>
      </div>
      {msg && <p className="text-sm text-accent">{msg}</p>}
    </form>
  );
}
