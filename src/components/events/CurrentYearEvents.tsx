import Link from "next/link";
import Image from "@/components/ui/SiteImage";
import { ArrowUpRight, CalendarDays, Images } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { currentRiYear, currentYearEvents, orderedGallery } from "@/data/events";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CoverImage } from "./CoverImage";
import { EmptyState } from "./EmptyState";

/** Current RI year: every event gets its own block with title, description, date or RI year, and photographs. */
export function CurrentYearEvents() {
  const list = currentYearEvents;
  return (
    <section id="current-year" aria-labelledby="current-year-title" className="section-y scroll-mt-20">
      <Container>
        <SectionHeading
          id="current-year-title"
          title={<>Current Year Events <span className="block text-[0.55em] text-saffron">RI Year {currentRiYear}</span></>}
        />
        {list.length === 0 ? (
          <div className="mt-12"><EmptyState title="No events this RI year yet">Photographs and details will be added after each event.</EmptyState></div>
        ) : (
          <ol className="mt-14 space-y-16 sm:space-y-24">
            {list.map((e, i) => {
              const photos = orderedGallery(e).filter((p) => p.src !== e.coverImage?.src);
              const strip = photos.slice(0, 4);
              const total = orderedGallery(e).length;
              const flip = i % 2 === 1;
              return (
                <Reveal as="li" key={e.slug}>
                  <article aria-labelledby={`ev-${e.slug}`} className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
                    <Link href={`/events/${e.slug}`} aria-label={`${e.title}: open event`} className={cn("group relative block overflow-hidden rounded-[1.4rem] border hairline lg:col-span-7", flip && "lg:order-2")}>
                      <CoverImage image={e.coverImage} aspect="aspect-[4/3] lg:aspect-[16/11]" sizes="(min-width:1024px) 58vw, 100vw" priority={i === 0} imgClassName="transition-transform duration-slow ease-cinematic group-hover:scale-105" />
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 border border-ivory/25 bg-obsidian/70 px-2.5 py-1 text-xs text-ivory/90 backdrop-blur-sm">
                        <Images aria-hidden className="size-3.5" /> {total} {total === 1 ? "photo" : "photos"}
                      </span>
                    </Link>
                    <div className={cn("lg:col-span-5", flip && "lg:order-1")}>
                      <p className="flex items-center gap-2 text-sm text-sky">
                        <CalendarDays aria-hidden className="size-4" />
                        {e.date ? formatDate(e.date) : `RI Year ${e.year}`}
                        {e.venue && <span className="text-ivory/74"> · {e.venue}</span>}
                      </p>
                      <h3 id={`ev-${e.slug}`} className="mt-3 font-display text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.1]">{e.title}</h3>
                      {e.description && <p className="mt-4 max-w-prose text-ivory/84">{e.description}</p>}
                      {strip.length > 0 && (
                        <ul className={cn("mt-6 grid gap-2", strip.length === 1 ? "grid-cols-1" : "grid-cols-4")} aria-label={`More photographs from ${e.title}`}>
                          {strip.map((p) => (
                            <li key={p.src}>
                              <Link href={`/events/${e.slug}#gallery`} className="img-skeleton group relative block aspect-square overflow-hidden rounded-xl border hairline">
                                <Image src={p.thumb ?? p.src} alt={p.alt} fill sizes="(min-width:1024px) 9vw, 22vw" loading="lazy" style={p.focus ? { objectPosition: p.focus } : undefined} className="object-cover transition-transform duration-slow ease-cinematic group-hover:scale-110" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link href={`/events/${e.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-saffron">
                        {total > 1 ? `View all ${total} photos` : "Explore Event"} <ArrowUpRight aria-hidden className="size-4" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ol>
        )}
      </Container>
    </section>
  );
}
