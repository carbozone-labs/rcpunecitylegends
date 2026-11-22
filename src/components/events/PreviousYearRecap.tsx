"use client";

import Image from "@/components/ui/SiteImage";
import { Images } from "lucide-react";
import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { currentRiYear, previousYearEvents, recapPhotos } from "@/data/events";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { ImageLightbox } from "./ImageLightbox";

const FEATURED = 3;

/** ONE combined gallery for every earlier RI year. No per-event cards: just the memories, group photos first. */
export function PreviousYearRecap() {
  const [open, setOpen] = useState<number | null>(null);
  const photos = recapPhotos;
  const featured = photos.slice(0, FEATURED);
  const rest = photos.slice(FEATURED);

  const tile = (p: (typeof photos)[number], i: number, className: string, sizes: string, eager = false) => (
    <button key={p.src} type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${photos.length}: ${p.alt}`} className={cn("img-skeleton group relative block w-full overflow-hidden rounded-2xl border hairline", className)}>
      <Image src={p.thumb ?? p.src} alt={p.alt} fill sizes={sizes} loading={eager ? "eager" : "lazy"} style={p.focus ? { objectPosition: p.focus } : undefined} className="object-cover transition-transform duration-slow ease-cinematic group-hover:scale-105" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent opacity-0 transition-opacity duration-base group-hover:opacity-100" />
      <span className="absolute bottom-2 left-3 right-3 translate-y-1 text-left text-xs font-semibold text-ivory opacity-0 transition-all duration-base group-hover:translate-y-0 group-hover:opacity-100">{p.caption}</span>
    </button>
  );

  return (
    <section id="previous-year-recap" aria-labelledby="recap-title" className="section-y scroll-mt-20 border-t hairline bg-charcoal">
      <Container>
        <SectionHeading
          id="recap-title"
          title="Previous Year Recap"
          intro={`Memories from the years before RI Year ${currentRiYear}, together in one place: ${photos.length} photographs from ${previousYearEvents.length} events. Tap any photo to view it full-screen.`}
        />
        {photos.length === 0 ? (
          <div className="mt-12"><EmptyState title="The recap is waiting for its photographs">Photographs from earlier years will appear here once they are added.</EmptyState></div>
        ) : (
          <>
            {featured.length > 0 && (
              <Reveal>
                <div className="mt-12 grid gap-3 sm:grid-cols-3 sm:grid-rows-2 sm:gap-4">
                  {featured[0] && tile(featured[0], 0, "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[26rem]", "(min-width:640px) 66vw, 100vw", true)}
                  {featured[1] && tile(featured[1], 1, "aspect-[4/3] sm:aspect-auto sm:min-h-[12rem]", "(min-width:640px) 33vw, 100vw", true)}
                  {featured[2] && tile(featured[2], 2, "aspect-[4/3] sm:aspect-auto sm:min-h-[12rem]", "(min-width:640px) 33vw, 100vw")}
                </div>
              </Reveal>
            )}
            {rest.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-label="More photographs from previous years">
                {rest.map((p, k) => (
                  <li key={p.src}>{tile(p, k + FEATURED, "aspect-[4/3]", "(min-width:1024px) 23vw, (min-width:768px) 31vw, 47vw")}</li>
                ))}
              </ul>
            )}
            <p className="mt-8 flex items-center gap-2 text-sm text-ivory/74"><Images aria-hidden className="size-4" /> Group photographs lead the recap. Tap any photo to enlarge it.</p>
            <ImageLightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} label="Previous Year Recap photo viewer" />
          </>
        )}
      </Container>
    </section>
  );
}
