# How to update events and partners

Everything is data-driven. You only edit two files; the pages update by themselves.

## Add an event: `src/data/events.ts`

Add one record to the `records` list. Only `slug`, `title` and `status` are required; every other field is optional and is
shown only when you fill it in. Use verified details only.

```ts
{
  slug: "official-event-name",        // lowercase-hyphenated, unique. The page becomes /events/official-event-name
  title: "Official Event Name",
  status: "upcoming",                 // "upcoming" | "completed" | "cancelled"
  date: "2026-12-14",                 // YYYY-MM-DD
  time: "6:00 PM onwards",
  venue: "Official venue name",
  shortDescription: "One or two lines for the cards.",
  description: "Full description for the event page.",
  coverImage: { src: "/images/events/official-event-name/cover.jpg", alt: "Describe the photo", width: 1600, height: 1000, subject: "group" },
  gallery: [{ src: "/images/events/official-event-name/01.jpg", alt: "Describe the photo", width: 1600, height: 1067, subject: "scene" }],
  registrationLink: "https://…",      // official link, upcoming events only
  year: "2026–2027",                  // RI year (July to June). Decides current-year vs. Previous Year Recap
  featured: true,                     // optional: makes it the headline upcoming event
}
```

* `status: "upcoming"` shows it in **Upcoming Events** (and on the Home page). The soonest event, or the one marked `featured`, becomes the large headline card.
* When the event is over, change `status` to `"completed"`. If its `year` equals `currentRiYear` (top of the derived code in `src/data/events.ts`) it gets its own block under **Current Year Events**. Any other year goes into the single **Previous Year Recap** gallery (no separate cards).
* **New RI year (1 July):** add the new term in `src/data/leadership.ts` and set `currentRiYear` in `src/data/events.ts` to the same value. Last year's events move into the recap by themselves. `npm run check:content` tells you if the two disagree.
* **Photos:** tag each with `subject`: `"group"` (many people together), `"scene"` (people taking part) or `"individual"`. Group photos lead every gallery and the recap, and should be used as the cover. Add `highlight: true` to the very biggest crowd shots to put them first in the recap.
* `status: "cancelled"` keeps it visible in Upcoming Events with a clear "Cancelled" label.
* Photos go in `public/images/events/<slug>/`. Give the real width and height of each photo.
* While the list is empty, the Events page shows the "Something exciting is coming" state. Nothing is invented.

## Add a partner: `src/data/partners.ts`

1. Put the logo in `public/images/partners/` (a transparent or white-background logo works best; never recolour or crop it).
2. Add one record to `records`:

```ts
{
  id: "official-name",                // lowercase-hyphenated, unique
  name: "Official Name",              // exactly as the partner writes it
  category: "sponsor",                // "sponsor" | "venue" | "collaboration" | "supporting"
  logo: { src: "/images/partners/official-name.webp", width: 600, height: 300 },   // real pixel size
  website: "https://…",               // optional
  description: "One short line.",     // optional
  order: 10,                          // optional: smaller numbers show first
  active: true,                       // optional: false hides it without deleting
}
```

It appears in its category on `/partners`. Sponsors also appear in the Home preview. Use each organisation once only.
A partner that belongs to more than one category should be listed once, in the category that fits best.

## Check your work

```
npm run check:content   # finds missing images, duplicate partners, incomplete completed events, bad links
npm run build           # production build
```


## Event photographs: how the 47-photo import is organised

* `archive/event-photos-original/<event-slug>/` holds every supplied photograph untouched (including `Dandiya.HEIC`). It is NOT part of the website.
* `archive/event-photos-manifest.csv` / `.json` map each original file to its web copies (source, pixel size, SHA-256 prefix, output paths, which photo is the cover).
* `public/images/events/<event-slug>/<slug>-NN.webp` is the web copy (long edge up to 2400 px, WebP quality 90, sRGB) used by the hero and the full-screen viewer.
  `<slug>-NN-thumb.webp` (960 px) is used in cards and gallery grids. Both share the same aspect ratio. HEIC was converted to WebP.
* In `src/data/events.ts` each photo has `src`, `thumb`, `alt`, `width`, `height` and an optional `focus` (CSS object-position, keeps faces in frame when cropped).
* To add a photo: put the web copy and thumb in the event's folder, then add it to that event's `gallery`. Run `npm run check:content`.
* After a build, `npm run audit:event-photos` re-verifies the whole import (originals archived, web copies valid, every photo in its record and in its built page).
* Dates, venues and RI years are deliberately empty until the club confirms them. Add `date: "YYYY-MM-DD"`, `venue` and `year` to a record when known.

## Previous Year Memories slideshow and extra designations

* The slideshow on the Events page reads only `src/data/previousYear.ts` (photos in `public/images/previous-year/`). Add a photo by saving a `.webp` (about 2000 px long edge) plus a 480 px `-thumb.webp` there and adding one line to that file. These photos are never mixed with the 2026–2027 event galleries.
* Extra year-wise designations for a person (shown on their profile) go in `extraRoles` in `src/data/leadership.ts`. Do not create a second profile for the same person.

## Publishing a change to GoDaddy

Any edit to `src/` or `public/` only goes live after you rebuild and upload:

```
npm run check:content && npm run typecheck && npm run lint
npm run build            # writes the site into out/
```

Then upload the contents of `out/` (with `.htaccess`) into `public_html`, as described in `DEPLOY.md`. The two Supabase values in `.env.production` are baked in at build time, so a changed key or project URL also needs a rebuild.

## Contact details and statistics

* Email, address, phone and social links: `club.contact` in `src/data/club.ts`. A `null` phone is hidden everywhere (footer, contact page). Add more social profiles to `socials` only with real links. The structured data (`OrganizationJsonLd.tsx`) reads the same values.
* Statistics: after the club confirms the five figures, set `statsVerified = true` in `src/data/club.ts`.

## Regular tasks after launch

* Review new enquiries in Supabase > Table Editor > `enquiries` (change `status`: New / In Review / Contacted / Closed). Rows with `notification_status` `failed` or `skipped` did not email the club: follow up manually.
* Add real events and photos as they happen (sections above); on 1 July start the new RI year (see "New RI year" above).
* Photos waiting in `review-needed/` need the club's confirmation of event name, date and consent before they are published.

