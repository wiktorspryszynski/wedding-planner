// Helpers for reading FormData in server actions.

export function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export function reqStr(fd: FormData, key: string): string {
  const v = str(fd, key);
  if (!v) throw new Error(`Pole "${key}" jest wymagane`);
  return v;
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function oneOf<T extends readonly string[]>(fd: FormData, key: string, values: T, fallback: T[number]): T[number] {
  const v = str(fd, key);
  return v && (values as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}
