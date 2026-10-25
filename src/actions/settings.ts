"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { parsePLN } from "@/lib/money";
import { done } from "@/lib/mutate";

export async function saveSettings(fd: FormData) {
  const user = await requireUser();
  db()
    .update(schema.settings)
    .set({
      weddingDate: str(fd, "weddingDate"),
      venue: str(fd, "venue"),
      totalBudget: parsePLN(fd.get("totalBudget")) ?? 0,
      costPerGuest: parsePLN(fd.get("costPerGuest")) ?? 0,
    })
    .where(eq(schema.settings.id, 1))
    .run();
  done(user, "settings", "update", "Zmieniono ustawienia");
}
