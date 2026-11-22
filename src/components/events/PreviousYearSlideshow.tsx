"use client";

import Image from "@/components/ui/SiteImage";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { previousYearPhotos } from "@/data/previousYear";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { ImageLightbox } from "./ImageLightbox";

const INTERVAL = 5000;
/** Pagination dots shown at once: a sliding window around the current photo, so 36 dots never overflow a phone screen. */
const WINDOW = 9;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Previous Year Memories: an automatic slideshow of photographs from earlier club years.
 * Photos are never cropped: each is shown whole over a soft blurred copy of itself, so portrait and landscape shots both look right.
 * Fully separate from the 2026–2027 event galleries (it only reads src/data/previousYear.ts).
 */
export function PreviousYearSlideshow() {
  const photos = previousYearPhotos;
  const count = photos.length;
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const go = useCallback((d: number) => { setDir(d >= 0 ? 1 : -1); setIndex((i) => (i + d + count) % count); }, [count]);
  const jump = (i: number) => { setDir(i >= index ? 1 : -1); setIndex(i); };

  // Autoplay: pauses while paused by the person, hovered/focused, the photo viewer is open, or reduced motion is requested.
  useEffect(() => {
    if (!playing || hover || lightbox !== null || reduce || count < 2) return;
    const t = window.setTimeout(() => go(1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [playing, hover, lightbox, reduce, count, index, go]);

  if (count === 0) {
    return (
      <section id="previous-year-recap" aria-labelledby="recap-title" className="section-y scroll-mt-20 border-t hairline bg-charcoal">
        <Container>
          <SectionHeading id="recap-title" title="Previous Year Memories" />
          <div className="mt-12"><EmptyState title="Memories are on their way">Photographs from earlier years will appear here once they are added.</EmptyState></div>
        </Container>
      </section>
    );
  }

  const photo = photos[index];
  const start = Math.max(0, Math.min(index - Math.floor(WINDOW / 2), count - WINDOW));
  const dots = photos.map((p, i) => ({ p, i })).slice(start, start + WINDOW);
  // the few photos around the current one are preloaded so the next slide never pops in
  const near = [1, 2].map((d) => photos[(index + d) % count]);
  const ctrl = "inline-flex size-11 items-center justify-center rounded-full border border-ivory/30 bg-obsidian/70 text-ivory backdrop-blur-sm transition-colors hover:border-saffron hover:text-saffron focus-visible:outline-none";

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 60, scale: reduce ? 1 : 1.03 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -60, scale: reduce ? 1 : 0.98 }),
  };

  return (
    <section id="previous-year-recap" aria-labelledby="recap-title" className="section-y scroll-mt-20 border-t hairline bg-charcoal">
      <Container>
        <SectionHeading
          id="recap-title"
          title={<>Previous Year Memories <span className="block text-[0.55em] text-saffron">From the years before this one</span></>}
          intro="Glimpses from earlier years of the club, kept apart from this year’s events. Use the arrows, the dots or your keyboard, or tap a photo to view it full-screen."
        />

        <Reveal>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Previous year memories slideshow"
            className="mt-12"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}
          >
            {/* fixed aspect ratio: the stage never changes size between photos, so there is no layout shift */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.4rem] border hairline bg-obsidian sm:aspect-[16/10] lg:aspect-[16/9]">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={photo.src}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE }}
                  className="absolute inset-0"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Photo ${index + 1} of ${count}`}
                >
                  <Image src={photo.thumb ?? photo.src} alt="" aria-hidden fill sizes="30vw" className="scale-110 object-cover opacity-60 blur-2xl" />
                  <div aria-hidden className="absolute inset-0 bg-obsidian/30" />
                  <button type="button" onClick={() => setLightbox(index)} aria-label={`Open photo ${index + 1} of ${count} full-screen: ${photo.alt}`} className="group absolute inset-0 block cursor-zoom-in">
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width:1280px) 1100px, 100vw" priority={index === 0} className="object-contain p-2 sm:p-4" draggable={false} />
                  </button>
                </motion.div>
              </AnimatePresence>

              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-obsidian/70 to-transparent" />
              <p className="pointer-events-none absolute left-4 top-4 rounded-full border border-ivory/25 bg-obsidian/70 px-3 py-1 text-xs font-semibold text-ivory/90 backdrop-blur-sm">{index + 1} / {count}</p>
              <span aria-hidden className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-ivory/25 bg-obsidian/70 px-3 py-1 text-xs text-ivory/90 backdrop-blur-sm"><Expand className="size-3.5" /> Tap to enlarge</span>

              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={cn(ctrl, "absolute left-3 top-1/2 -translate-y-1/2")}><ChevronLeft aria-hidden /></button>
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className={cn(ctrl, "absolute right-3 top-1/2 -translate-y-1/2")}><ChevronRight aria-hidden /></button>

              {/* progress bar for the current slide (static when paused or reduced motion) */}
              {playing && !reduce && !hover && lightbox === null && (
                <motion.span key={`p-${index}`} aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-saffron" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: INTERVAL / 1000, ease: "linear" }} />
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} aria-label={playing ? "Pause slideshow" : "Play slideshow"} className={ctrl}>
                {playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
              </button>
              <div role="group" aria-label="Choose a photo" className="flex min-w-0 flex-1 items-center justify-center gap-1 py-1">
                {dots.map(({ p, i }) => (
                  <button key={p.src} type="button" onClick={() => jump(i)} aria-label={`Show photo ${i + 1} of ${count}`} aria-current={i === index ? "true" : undefined} className="inline-flex size-6 shrink-0 items-center justify-center">
                    <span className={cn("block h-1.5 rounded-full transition-all duration-base", i === index ? "w-6 bg-saffron" : "w-1.5 bg-ivory/35 hover:bg-ivory/70")} />
                  </button>
                ))}
              </div>
              <p aria-live="off" className="hidden w-11 text-right text-sm text-ivory/74 sm:block">{index + 1}/{count}</p>
            </div>
          </div>
        </Reveal>

        {/* hidden preloads for the next slides */}
        <div aria-hidden className="sr-only">
          {near.map((p) => <Image key={p.src} src={p.src} alt="" width={p.width} height={p.height} sizes="(min-width:1280px) 1100px, 100vw" loading="eager" />)}
        </div>

        <ImageLightbox photos={photos} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} label="Previous year memories photo viewer" />
      </Container>
    </section>
  );
}
