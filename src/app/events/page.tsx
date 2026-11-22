import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PageHero } from "@/components/shared/PageHero";
import { CTASection } from "@/components/shared/CTASection";
import { UpcomingEvents } from "@/components/events/UpcomingEvents";
import { CurrentYearEvents } from "@/components/events/CurrentYearEvents";
import { EventsJumpNav } from "@/components/events/EventsJumpNav";
import { PreviousYearSlideshow } from "@/components/events/PreviousYearSlideshow";
import { joinHref } from "@/data/club";

export const metadata: Metadata = pageMeta({
  title: "Events",
  description: "Events of the Rotaract Club of Pune City Legends: this RI year’s events one by one, a Previous Year Memories slideshow, and upcoming announcements.",
  path: "/events",
});

export default function EventsPage() {
  return (
    <>
      <PageHero lines={["Every Event", "Leaves a Legacy."]} intro="From service drives to ceremonies, the moments that shape the LEGENDS journey, recorded here as they happened." next="archive" />
      <EventsJumpNav />
      <CurrentYearEvents />
      <PreviousYearSlideshow />
      <UpcomingEvents />
      <CTASection title="Be part of what comes next." actions={[{ label: "Join the Movement", href: joinHref }]} />
    </>
  );
}
