import { currentRiYear } from "@/data/events";

const links = [
  { href: "#current-year", label: `Current Year · RI ${currentRiYear}` },
  { href: "#previous-year-recap", label: "Previous Year Memories" },
  { href: "#upcoming", label: "Upcoming" },
];

/** In-page links for the three parts of the Events page. */
export function EventsJumpNav() {
  return (
    <nav id="archive" aria-label="Events page sections" className="border-b hairline py-5">
      <ul className="mx-auto flex max-w-content flex-wrap gap-3 gutter">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="glass inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-ivory transition-colors duration-base hover:text-saffron">{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
