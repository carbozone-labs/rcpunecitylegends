import type { Person, Role, Term } from "@/types";

/**
 * Single source of truth for leadership, taken from the club document.
 * Add `photo`, `bio` and `contributions` to a person only once the client supplies and approves them.
 */
export const people: Person[] = [
  { slug: "shreya-kotkar", name: "Rtr. Shreya Kotkar", photo: "/images/team/shreya-kotkar.webp" },
  { slug: "ayushi-gupta", name: "Rtr. Ayushi Gupta", photo: "/images/team/ayushi-gupta.webp" },
  { slug: "rohit-thakre", name: "Rtr. Rohit Thakre", photo: "/images/team/rohit-thakre.webp" },
  { slug: "sahil-deole", name: "Rtr. Sahil Deole", photo: "/images/team/sahil-deole.webp" },
  { slug: "samruddhi-desale", name: "Rtr. Samruddhi Desale", photo: "/images/team/samruddhi-desale.webp" },
  { slug: "asawari-nikam", name: "Rtr. Asawari Nikam", photo: "/images/team/asawari-nikam.webp" },
  { slug: "shrinidhi-gundewar", name: "Rtr. Shrinidhi Gundewar", photo: "/images/team/shrinidhi-gundewar.webp" },
  { slug: "aditi-shrinewar", name: "Rtr. Aditi Shrinewar", photo: "/images/team/aditi-shrinewar.webp" },
  { slug: "arya-kalambe", name: "Rtr. Arya Kalambe", photo: "/images/team/arya-kalambe.webp" },
  { slug: "shruti-khedkar", name: "Rtr. Shruti Khedkar", photo: "/images/team/shruti-khedkar.webp" },
  { slug: "rohit-pawar", name: "Rtr. Rohit Pawar", photo: "/images/team/rohit-pawar.webp" },
  { slug: "shamal-dandgavhal", name: "Rtr. Shamal Dandgavhal", photo: "/images/team/shamal-dandgavhal.webp" },
  { slug: "atharva-yadav", name: "Rtr. Atharv Yadav", photo: "/images/team/atharva-yadav.webp" },
  { slug: "mohit-teke", name: "Rtr. Mohit Teke", photo: "/images/team/mohit-teke.webp" },
  { slug: "chaitrali-khedkar", name: "Rtr. Chaitrali Khedkar", photo: "/images/team/chaitrali-khedkar.webp" },
  { slug: "prasanna-tayade", name: "Rtr. Prasanna Tayade", photo: "/images/team/prasanna-tayade.webp" },
  { slug: "sarvesh-bhosale", name: "Rtr. Sarvesh Bhosale", photo: "/images/team/sarvesh-bhosale-2025-26.webp" },
  { slug: "akash-patil", name: "Rtr. Akash Patil", photo: "/images/team/akash-patil-2024-25.webp" },
];

/** Core & Board of Directors for the current year, in the order supplied by the club. */
export const currentBoard: { slug: string; role: string }[] = [
  { slug: "shreya-kotkar", role: "Club President" },
  { slug: "ayushi-gupta", role: "Club Secretary" },
  { slug: "rohit-thakre", role: "Treasurer" },
  { slug: "sahil-deole", role: "Vice President" },
  { slug: "samruddhi-desale", role: "Sergeant-at-Arms (SAA)" },
  { slug: "asawari-nikam", role: "Professional Service Director (PDD)" },
  { slug: "shrinidhi-gundewar", role: "Club Service Director (CSD)" },
  { slug: "aditi-shrinewar", role: "Community Service Director (CMD)" },
  { slug: "arya-kalambe", role: "ISD & PRO" },
  { slug: "shruti-khedkar", role: "Co-CSD & Co-ISD" },
  { slug: "rohit-pawar", role: "IRRRO" },
  { slug: "shamal-dandgavhal", role: "DEI & MDD" },
  { slug: "atharva-yadav", role: "World Rotaract Week Chairperson" },
  { slug: "mohit-teke", role: "Editor" },
  { slug: "chaitrali-khedkar", role: "Editor" },
  { slug: "prasanna-tayade", role: "Sports Representative" },
];
export const boardRole = (slug: string) => currentBoard.find((b) => b.slug === slug)?.role;

/** Chronological. president / secretary are person slugs. */
export const terms: Term[] = [
  { year: "2024–2025", president: "akash-patil", secretary: "sarvesh-bhosale" },
  { year: "2025–2026", president: "sarvesh-bhosale", secretary: "shreya-kotkar" },
  { year: "2026–2027", president: "shreya-kotkar", secretary: "ayushi-gupta" },
];

export const currentYear = terms[terms.length - 1].year;

/**
 * ADDITIONAL historical designations, on top of the president / secretary terms above and the current board.
 * One entry per person per year; they are shown together under the same profile, oldest first.
 * Add new history here (never create a second profile for the same person).
 */
export const extraRoles: { slug: string; year: string; label: string }[] = [
  { slug: "shreya-kotkar", year: "2024–2025", label: "Club Service Director" },
  { slug: "atharva-yadav", year: "2024–2025", label: "PRO" },
  { slug: "atharva-yadav", year: "2025–2026", label: "PDD" },
  { slug: "mohit-teke", year: "2024–2025", label: "Editor" },
  { slug: "mohit-teke", year: "2025–2026", label: "PRO Editor" },
];

export type ProfileRole = { year: string; label: string };

/** Full year-by-year designation history for a profile: president/secretary terms, additional designations and the current board role, oldest first. */
export function profileRoles(slug: string): ProfileRole[] {
  const list: ProfileRole[] = rolesFor(slug).map((r) => ({ label: clubRole(r.role), year: r.year }));
  for (const e of extraRoles) if (e.slug === slug && !list.some((r) => r.year === e.year && r.label === e.label)) list.push({ label: e.label, year: e.year });
  const current = boardRole(slug);
  if (current && !list.some((r) => r.year === currentYear)) list.push({ label: current, year: currentYear });
  return list.map((r, i) => ({ r, i })).sort((a, b) => a.r.year.localeCompare(b.r.year) || a.i - b.i).map((x) => x.r);
}

export const getPerson = (slug: string) => people.find((p) => p.slug === slug);
export const requirePerson = (slug: string): Person => {
  const p = getPerson(slug);
  if (!p) throw new Error(`Unknown person slug: ${slug}`);
  return p;
};

export const getTerm = (year: string) => terms.find((t) => t.year === year);

export type RoleEntry = { year: string; role: Role };

/** All documented roles for a person, oldest first. */
export function rolesFor(slug: string): RoleEntry[] {
  return terms.flatMap((t) => {
    const out: RoleEntry[] = [];
    if (t.president === slug) out.push({ year: t.year, role: "President" });
    if (t.secretary === slug) out.push({ year: t.year, role: "Secretary" });
    return out;
  });
}

export const latestRole = (slug: string): RoleEntry => {
  const r = rolesFor(slug);
  return r[r.length - 1];
};

export const clubRole = (role: Role) => `Club ${role}`;
