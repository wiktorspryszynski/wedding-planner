import "server-only";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import type { User } from "./auth";

type Action = "create" | "update" | "delete";

/** Records who changed what and refreshes every route (the dashboard aggregates all modules). */
export function done(user: User, entity: string, action: Action, summary: string, entityId?: number) {
  db().insert(schema.activityLog).values({ userId: user.id, entity, entityId, action, summary }).run();
  revalidatePath("/", "layout");
}

/** Refresh without an activity entry — for noisy UI changes like dragging a table. */
export function refreshAll() {
  revalidatePath("/", "layout");
}
