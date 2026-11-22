import type { ClubYear, NavItem, Stat } from "@/types";
import { features } from "@/config/features";
import { requirePerson, terms } from "./leadership";

export const club = {
  name: "Rotaract Club of Pune City Legends",
  shortName: "LEGENDS",
  chartered: "8 August 2024",
  theme: "तेजस्वि नावधीतमस्तु",
  themeMeaningMarathi:
    "आपण सर्वजण ज्ञानाने समृद्ध होऊ, संयमाने आणि समजुतीने एकमेकांकडून शिकू, चिकाटीने एकत्र प्रगती करू आणि आपल्या कार्यातून समाजात एक चिरंतन तेज निर्माण करू.",
  themeMeaningEnglish:
    "May we all be enriched with knowledge, learn from one another with patience and understanding, grow together with perseverance, and create a lasting impact on society through our actions.",
  // Source text had typos ("lub", "proessionals"); corrected here, wording otherwise unchanged.
  about:
    "Rooted in timeless Indian values and heritage, our Rotaract club empowers students and professionals to drive socially meaningful impact through ethical leadership, cultural pride and selfless service towards the community.",
  /**
   * Official contact details (supplied by the club). `phone` stays null until the club supplies one: every place that shows
   * contact details hides a null phone. Add other social profiles to `socials` only when the club supplies the real links.
   */
  contact: {
    email: "rcpunecitylegends@gmail.com" as string | null,
    phone: null as string | null,
    address: "Dwellion 300, Vrindavan Apartment, Law College Road, Pune" as string | null,
    socials: [{ label: "Instagram", href: "https://www.instagram.com/rac_punecity_legends", handle: "@rac_punecity_legends" }] as {
      label: string;
      href: string;
      handle?: string;
    }[],
  },
  /** TODO(client): supply a hero photograph; place it in /public/images and set the path here. */
  heroImage: null as string | null,
};

export const nav: NavItem[] = [
  { label: "Home", href: "/", id: "home" },
  { label: "Our Story", href: "/our-story", id: "our-story" },
  { label: "Meet the Legends", href: "/team", id: "team" },
  { label: "Events", href: "/events", id: "events" },
  { label: "Partners", href: "/partners", id: "partners" },
  { label: "Manifesto", href: "/manifesto", id: "manifesto" },
  // Temporarily hidden: controlled by src/config/features.ts
  ...(features.legendZoneEnabled ? [{ label: "Legend Zone", href: "/legend-zone", id: "legend-zone" }] : []),
  { label: "Contact", href: "/contact", id: "contact" },
  { label: "Join Us", href: "/join", id: "join" },
];

/**
 * Enquiry entry points. Every enquiry is submitted on this website (see src/components/forms/EnquiryForm.tsx).
 *  - joinHref     "Join Us" / "Join the Movement": the Join page opens on the Membership enquiry.
 *  - partnerHref  "Become a Partner": the Join page, pre-set to the Partnership enquiry.
 *  - contactHref  "Contact Us": the General enquiry form on the Contact page.
 * joinHref stays a plain path on purpose: the navigation uses it to highlight the active page.
 */
export const joinHref = "/join";
export const partnerHref = "/join?type=partnership#enquiry";
export const contactHref = "/contact#message";

/**
 * Set to true once the club has verified the figures below. While false, the site shows a
 * "pending verification" note beside every place the statistics appear.
 */
export const statsVerified = false;

/** Source-provided figures (150+ events, 300+ participants, 30+ members, 75+ letterhead exchanges, 25+ match club agreements). */
export const stats: Stat[] = [
  { value: 150, suffix: "+", label: "Events" },
  { value: 300, suffix: "+", label: "Participants" },
  { value: 30, suffix: "+", label: "Members" },
  { value: 75, suffix: "+", label: "Letterhead Exchanges" },
  { value: 25, suffix: "+", label: "Match Club Agreements" },
];

export const journey: ClubYear[] = terms.map((t) => ({
  years: t.year,
  president: requirePerson(t.president).name,
  secretary: requirePerson(t.secretary).name,
}));

export const manifesto = [
  "Leadership isn’t a title.",
  "Service doesn’t need an audience.",
  "Mistakes are lessons, not endings.",
  "Patience builds people. Consistency builds trust. Teamwork builds Legends.",
];
export const manifestoClose = {
  lead: "We don’t need to be perfect. We need to keep showing up.",
  final: "We are Legends. And we’re just getting started.",
};
