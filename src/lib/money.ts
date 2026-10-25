const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

/** Grosze → "12 345 zł". */
export function formatPLN(grosze: number | null | undefined) {
  return PLN.format(Math.round((grosze ?? 0) / 100));
}

/** "12 345,50" / "12345.5" → grosze. Empty → null. */
export function parsePLN(input: FormDataEntryValue | null): number | null {
  const s = String(input ?? "").replace(/\s|zł/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Grosze → value for an <input> ("1234.5"). */
export function toInput(grosze: number | null | undefined) {
  return grosze == null ? "" : String(grosze / 100);
}
