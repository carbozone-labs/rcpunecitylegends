/** Canonical site URL; override at build time for alternate hosts such as the GitHub Pages project site. */
const DEFAULT_SITE_URL = "https://rcpunecitylegends.org";

/** Public address of the site (no trailing slash). */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
