# Legend Zone (prototype) - currently switched OFF

The route files in this folder are named `*.zone.tsx` (for example `page.zone.tsx`, `layout.zone.tsx`) on purpose.

Next.js only builds a file as a route if its extension is listed in `pageExtensions`. `next.config.mjs` adds the
`zone.tsx` extension **only when `legendZoneEnabled` is `true`** in `src/config/features.ts`.

| `legendZoneEnabled` | Result |
| ------------------- | ------ |
| `false` (now)       | These files are ignored by the router: no `/legend-zone/*` page is compiled or exported, so every such URL shows the normal 404. No navigation link is shown. No demo data ships. |
| `true`              | The routes are built again and the "Legend Zone" navigation entry returns. |

Nothing was deleted. The source lives here and in:

- `src/components/legend-zone/`
- `src/data/legendZone.ts`
- `src/lib/legendZone.ts`

To re-enable: set `legendZoneEnabled: true` in `src/config/features.ts`, then restart `npm run dev` (or run `npm run build`).
When the new Legend Zone is built, rename the files back to plain `page.tsx` / `layout.tsx` / `not-found.tsx` and remove the
`pageExtensions` switch from `next.config.mjs`.
