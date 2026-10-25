// Shared by server actions and the client-side household form.

/** First name stored for an unnamed plus-one; the real name can be filled in later. */
export const PLUS_ONE = "+1";
const PLUS_ONE_SUFFIX = / z os\. tow\.$/;

type Named = { firstName: string; lastName: string; household?: string | null };

export function guestName(g: Named) {
  if (g.firstName === PLUS_ONE && !g.lastName) {
    const anchor = g.household?.replace(PLUS_ONE_SUFFIX, "");
    return anchor ? `Os. tow. (${anchor})` : "Osoba towarzysząca";
  }
  return `${g.firstName} ${g.lastName}`.trim();
}

/** Polish plural family name: Kowalski → Kowalscy, Nowak → Nowakowie. */
export function familyName(lastName: string) {
  const m = lastName.match(/^(.*)(sk|ck|dzk)(i|a)$/i);
  if (m) return `${m[1]}${m[2].slice(0, -1)}cy`;
  if (/a$/i.test(lastName)) return lastName; // feminine form without a known plural
  return `${lastName}owie`;
}

const MALE_A = new Set(["kuba", "barnaba", "kosma", "jarema", "bonawentura", "dyzma"]);

/** Best guess from a Polish first name; ignores prefixes like "Babcia" / "Wujek". */
function isFeminine(firstName: string) {
  const last = firstName.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  return last.endsWith("a") && !MALE_A.has(last);
}

/** Inherited last name in the right gender: Kowalski → Kowalska for Anna. Other names unchanged. */
export function adaptLastName(lastName: string, firstName: string) {
  const m = lastName.match(/^(.*(?:sk|ck|dzk))(i|a)$/i);
  if (!m || !firstName.trim()) return lastName;
  return m[1] + (isFeminine(firstName) ? "a" : "i");
}

export type DraftPerson = { firstName: string; lastName: string; type: string };

const full = (p: DraftPerson) => `${p.firstName.trim()} ${p.lastName.trim()}`.trim();

/**
 * Invitation-style label: "Anna i Jan Kowalscy", "Kowalscy", "Jan Kowalski i Anna Nowak",
 * "Jan Kowalski + Kasia" (named companion), "Jan Kowalski z os. tow." (unnamed +1).
 */
export function suggestHousehold(people: DraftPerson[], plusOne: boolean) {
  const named = people.filter((p) => p.firstName.trim());
  const family = named.filter((p) => p.type !== "plus_one");
  const companions = named.filter((p) => p.type === "plus_one");
  if (family.length === 0) return companions.map(full).join(" i ");

  const last = family[0].lastName.trim();
  // Kowalska and Kowalski are the same family.
  const sameName = family.every((p) => !p.lastName.trim() || familyName(p.lastName.trim()) === familyName(last));
  let label: string;
  if (family.length === 1) {
    label = full(family[0]);
  } else if (sameName && last) {
    label = family.length === 2 ? `${family[0].firstName.trim()} i ${family[1].firstName.trim()} ${familyName(last)}` : familyName(last);
  } else {
    label = family.map(full).join(" i ");
  }
  if (companions.length) label += ` + ${companions.map(full).join(", ")}`;
  return plusOne ? `${label} z os. tow.` : label;
}
