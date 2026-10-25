"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { clearSession, setSession } from "@/lib/session";

export type LoginState = { error: string; login: string } | null;

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const login = String(fd.get("login") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const user = db().select().from(schema.users).where(eq(schema.users.login, login)).get();
  // Compare against a dummy hash when the user is missing to keep timing uniform.
  const ok = bcrypt.compareSync(password, user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !ok) return { error: "Nieprawidłowy login lub hasło.", login };
  await setSession({ userId: user.id });
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
