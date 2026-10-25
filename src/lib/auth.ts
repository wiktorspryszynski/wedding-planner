import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getSession } from "./session";

export type User = { id: number; name: string };

// Data Access Layer entry point: every page and server action goes through this.
// Reading the cookie also marks the caller as request-time (never prerendered).
export async function requireUser(): Promise<User> {
  const { userId } = await getSession();
  if (!userId) redirect("/login");
  const user = db()
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  if (!user) redirect("/login");
  return user;
}
