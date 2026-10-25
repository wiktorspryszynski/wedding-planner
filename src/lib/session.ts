import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sealData, unsealData } from "iron-session";

export type SessionData = { userId?: number };

export const SESSION_COOKIE = "wedding_session";
const TTL_SECONDS = 60 * 60 * 24 * 30;

function password() {
  const p = process.env.SESSION_SECRET;
  if (!p || p.length < 32) throw new Error("SESSION_SECRET must be set (min. 32 chars)");
  return p;
}

export async function getSession(): Promise<SessionData> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return {};
  // unsealData checks expiry against the clock — keep it out of prerendering.
  await connection();
  return unsealData<SessionData>(cookie, { password: password(), ttl: TTL_SECONDS });
}

export async function setSession(data: SessionData) {
  const sealed = await sealData(data, { password: password(), ttl: TTL_SECONDS });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
