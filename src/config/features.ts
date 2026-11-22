/**
 * Feature flags.
 *
 * legendZoneEnabled
 *   false (current): the Legend Zone prototype is completely switched off.
 *     - No navbar, mobile menu, footer or dock link points to it.
 *     - Its routes (/legend-zone and everything under it) are NOT compiled and NOT exported, so the URLs return the
 *       normal site 404 page. Nothing from the prototype ships to visitors.
 *   true: navigation links come back and the routes are built again.
 *
 * The route switch lives in next.config.mjs (it reads this very file, so this is the single place to change).
 * Restart `npm run dev` after changing it. The prototype source code is kept intact in
 * src/app/legend-zone, src/components/legend-zone, src/data/legendZone.ts and src/lib/legendZone.ts.
 * See src/app/legend-zone/README.md and SETUP_ENQUIRY_SYSTEM.md ("Re-enabling the Legend Zone").
 */
export const features = {
  legendZoneEnabled: false,
};
