import { club } from "@/data/club";
import { siteUrl } from "@/lib/site";

/**
 * Structured data for the club, using only facts the club has supplied (name, founding date, email, address, Instagram).
 * Add a phone number, postal code or further profiles here only once the club supplies verified values.
 */
export function OrganizationJsonLd() {
  const { email, address, socials } = club.contact;
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: club.name,
    alternateName: club.shortName,
    url: siteUrl(),
    logo: `${siteUrl()}/icons/icon-512.png`,
    foundingDate: "2024-08-08",
    ...(email ? { email } : {}),
    ...(address
      ? { address: { "@type": "PostalAddress", streetAddress: address.replace(/,\s*Pune$/, ""), addressLocality: "Pune", addressRegion: "Maharashtra", addressCountry: "IN" } }
      : {}),
    ...(socials.length ? { sameAs: socials.map((s) => s.href) } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
