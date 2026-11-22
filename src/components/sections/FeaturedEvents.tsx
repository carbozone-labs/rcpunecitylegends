import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ComingSoon } from "@/components/events/ComingSoon";
import { EventCard } from "@/components/events/EventCard";
import { currentRiYear, currentYearEvents, upcomingEvents } from "@/data/events";

/** Homepage teaser: the next upcoming events, or the compact "something exciting is coming" band. */
export function FeaturedEvents() {
  const upcoming = upcomingEvents.length > 0;
  const picks = (upcoming ? upcomingEvents : currentYearEvents).filter((e) => e.coverImage).slice(0, 3);
  return (
    <section id="events" aria-labelledby="events-title" className="section-y bg-charcoal">
      <Container>
        <SectionHeading id="events-title" title={upcoming || picks.length === 0 ? "Upcoming Events" : "Current Year Events"} intro={upcoming ? "What we are building next." : picks.length ? `Moments from RI Year ${currentRiYear}, in the club’s own photographs.` : undefined} />
        {picks.length === 0 ? (
          <div className="mt-12"><ComingSoon compact /></div>
        ) : (
          <ul className="mt-14 grid gap-x-6 gap-y-12 md:grid-cols-3">
            {picks.map((e, i) => (
              <Reveal as="li" key={e.slug} delay={i * 0.1}><EventCard event={e} shape="photo" sizes="(min-width:768px) 30vw, 100vw" /></Reveal>
            ))}
          </ul>
        )}
        <div className="mt-12"><Button href="/events" variant="secondary">{picks.length ? "Explore All Events" : "Go to Events"}</Button></div>
      </Container>
    </section>
  );
}
