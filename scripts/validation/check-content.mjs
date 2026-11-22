#!/usr/bin/env node
/**
 * Content and asset check (no dependencies). Run: npm run check:content
 *  - every /images/... or /icons/... path referenced in src/ must exist in public/
 *  - event and leadership records must be internally consistent
 *  - events: RI year / group-photo cover rules, the Previous Year Recap must contain every previous-year photo; valid status; completed events must be complete (name, description, cover, alt text). A missing date/year is only a warning: dates are never guessed
 *  - no Google Forms / external enquiry form links left in src/ (enquiries are handled by the on-site form)
 *  - partners: unique ids and names (no organisation listed twice), valid category, logo file present, https links
 * Exits with code 1 if there are errors.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// fileURLToPath (not .pathname) so this also works on Windows paths such as C:\\Users\\...
const root = fileURLToPath(new URL("../..", import.meta.url));
const errors = [];
const warnings = [];

// 1. Asset references
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const refs = new Map();
for (const file of walk(join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
  // Ignore comments, which contain documentation examples
  const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const m of text.matchAll(/["'`](\/(?:images|icons)\/[^"'`\s]+\.(?:png|jpe?g|webp|avif|svg|gif))["'`]/g)) {
    if (!refs.has(m[1])) refs.set(m[1], relative(root, file));
  }
}
for (const [path, file] of refs) if (!existsSync(join(root, "public", path))) errors.push(`Missing image: ${path} (referenced in ${file})`);

// 1b. The enquiry system is native: no Google Forms links or leftover constants anywhere in src/
for (const file of walk(join(root, "src")).filter((f) => /\.(ts|tsx|md)$/.test(f))) {
  const text = readFileSync(file, "utf8");
  if (/docs\.google\.com\/forms|forms\.gle|CLUB_FORM_URL/i.test(text)) errors.push(`Google Forms reference found in ${relative(root, file)}`);
}

// 2. Records
const load = (p) => import(pathToFileURL(join(root, p)).href);
const { events, currentYearEvents, previousYearEvents, recapPhotos, currentRiYear } = await load("src/data/events.ts");
const { people, terms, extraRoles } = await load("src/data/leadership.ts");
const { previousYearPhotos } = await load("src/data/previousYear.ts");
const { activePartners, partnerCategories } = await load("src/data/partners.ts");

const dupes = (arr, what) => { const seen = new Set(); arr.forEach((x) => { if (seen.has(x)) errors.push(`Duplicate ${what}: ${x}`); seen.add(x); }); };
dupes(events.map((e) => e.slug), "event slug");
dupes(people.map((p) => p.slug), "person slug");
const slugOk = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
events.forEach((e) => { if (!slugOk(e.slug)) errors.push(`Event slug is not lowercase-hyphenated: ${e.slug}`); });
terms.forEach((t) => [t.president, t.secretary].forEach((s) => { if (!people.some((p) => p.slug === s)) errors.push(`Term ${t.year} references unknown person: ${s}`); }));

const photoProblems = (ph, where) => {
  if (!ph.alt || ph.alt.trim().length < 5) errors.push(`${where}: photo needs meaningful alt text (${ph.src})`);
  if (!(ph.width > 0 && ph.height > 0)) errors.push(`${where}: photo needs width and height (${ph.src})`);
};
const STATUSES = ["upcoming", "completed", "cancelled"];
for (const e of events) {
  const where = `Event "${e.slug}"`;
  if (!e.title?.trim()) errors.push(`${where}: missing title`);
  if (!STATUSES.includes(e.status)) errors.push(`${where}: status must be one of ${STATUSES.join(", ")}`);
  if (e.date && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.push(`${where}: date must be YYYY-MM-DD`);
  if (e.registrationLink && !/^https:\/\//.test(e.registrationLink)) errors.push(`${where}: registrationLink must start with https://`);
  if (e.registrationLink && e.status !== "upcoming") warnings.push(`${where}: registrationLink is ignored unless the event is upcoming`);
  if (e.coverImage) photoProblems(e.coverImage, where);
  e.gallery?.forEach((g) => photoProblems(g, where));
  if (e.status === "completed") {
    if (!e.date && !e.year) warnings.push(`${where}: no verified date or RI year yet (add one when the club confirms it)`);
    if (!(e.description || e.shortDescription)) errors.push(`${where}: a completed event needs a description`);
    if (!e.coverImage) errors.push(`${where}: a completed event needs a cover photograph`);
    if (!e.gallery?.length) warnings.push(`${where}: no gallery photographs yet`);
  }
}
// RI year / recap rules
if (terms[terms.length - 1].year !== currentRiYear) errors.push(`currentRiYear (${currentRiYear}) in events.ts must equal the latest leadership term (${terms[terms.length - 1].year})`);
const SUBJECTS = ["group", "scene", "individual"];
for (const e of events) {
  for (const ph of [e.coverImage, ...(e.gallery ?? [])].filter(Boolean)) if (ph.subject && !SUBJECTS.includes(ph.subject)) errors.push(`Event "${e.slug}": photo subject must be one of ${SUBJECTS.join(", ")} (${ph.src})`);
  if (e.category !== undefined) errors.push(`Event "${e.slug}": the category field was removed; delete it`);
  const hasGroup = (e.gallery ?? []).some((g) => g.subject === "group");
  if (hasGroup && e.coverImage && e.coverImage.subject !== "group") warnings.push(`Event "${e.slug}": has group photos but the cover is not one (the cover should show the majority of the people)`);
  if (e.status === "completed" && e.gallery?.length && (e.gallery ?? []).some((g) => !g.subject)) warnings.push(`Event "${e.slug}": some photos have no subject tag (group / scene / individual)`);
}
const completedCount = events.filter((e) => e.status === "completed").length;
if (currentYearEvents.length + previousYearEvents.length !== completedCount) errors.push("Every completed event must be either current-year or in the Previous Year Recap");
const expectedRecap = new Set(previousYearEvents.flatMap((e) => [...(e.gallery ?? []), ...(e.coverImage ? [e.coverImage] : [])].map((p) => p.src)));
if (recapPhotos.length !== expectedRecap.size) errors.push(`Previous Year Recap shows ${recapPhotos.length} photos but previous-year events have ${expectedRecap.size}`);
// Previous Year Memories slideshow: files must exist and must never reuse a current-year photograph
extraRoles.forEach((r) => { if (!people.some((p) => p.slug === r.slug)) errors.push(`Additional designation references unknown person: ${r.slug}`); });
const currentSrcs = new Set(currentYearEvents.flatMap((e) => [...(e.gallery ?? []), ...(e.coverImage ? [e.coverImage] : [])].map((p) => p.src)));
dupes(previousYearPhotos.map((p) => p.src), "previous-year photo");
for (const p of previousYearPhotos) {
  if (currentSrcs.has(p.src)) errors.push(`Previous-year photo is also used by a current-year event: ${p.src}`);
  if (!existsSync(join(root, "public", p.src)) || (p.thumb && !existsSync(join(root, "public", p.thumb)))) errors.push(`Previous-year photo not found: ${p.src}`);
}
console.log(`Previous Year Memories slideshow: ${previousYearPhotos.length} photo(s).`);
console.log(`RI year ${currentRiYear}: ${currentYearEvents.length} current-year event(s); Previous Year Recap: ${recapPhotos.length} photo(s) from ${previousYearEvents.length} event(s).`);

// Partners: nobody listed twice, every record usable
const seenName = new Set();
const catIds = partnerCategories.map((c) => c.id);
dupes(activePartners.map((p) => p.id), "partner id");
for (const p of activePartners) {
  const where = `Partner "${p.id}"`;
  if (!slugOk(p.id)) errors.push(`${where}: id is not lowercase-hyphenated`);
  if (!p.name?.trim()) errors.push(`${where}: missing name`);
  const key = p.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (seenName.has(key)) errors.push(`${where}: the same organisation is listed twice (${p.name})`);
  seenName.add(key);
  if (!catIds.includes(p.category)) errors.push(`${where}: unknown category ${p.category}`);
  if (!p.logo && !p.photo) warnings.push(`${where}: no logo or photo, the card will show the name only`);
  for (const img of [p.logo, p.photo].filter(Boolean)) {
    if (!(img.width > 0 && img.height > 0)) errors.push(`${where}: logo/photo needs real width and height`);
    if (!existsSync(join(root, "public", img.src))) errors.push(`${where}: image not found: ${img.src}`);
  }
  if (p.website && !/^https:\/\//.test(p.website)) errors.push(`${where}: website must start with https://`);
}
for (const p of people) {
  if (p.photo && !existsSync(join(root, "public", p.photo))) errors.push(`Person "${p.slug}": photo not found: ${p.photo}`);
}

console.log(`Checked ${refs.size} image reference(s), ${events.length} event(s), ${activePartners.length} partner(s), ${people.length} people, ${terms.length} leadership year(s).`);
warnings.forEach((w) => console.log(`  warning: ${w}`));
errors.forEach((e) => console.log(`  ERROR:   ${e}`));
console.log(errors.length ? `\n${errors.length} error(s).` : "\nNo errors.");
process.exit(errors.length ? 1 : 0);
