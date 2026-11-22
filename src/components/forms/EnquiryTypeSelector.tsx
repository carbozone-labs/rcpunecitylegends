"use client";

import { cn } from "@/lib/utils";
import type { EnquiryType } from "@/lib/enquiry";

export type { EnquiryType };

const options: { value: EnquiryType; title: string; text: string }[] = [
  { value: "membership", title: "Membership enquiry", text: "For individuals interested in learning more about joining the club." },
  { value: "partnership", title: "Partnership enquiry", text: "For clubs, organizations and groups interested in potential collaborations." },
  { value: "general", title: "General enquiry", text: "For questions, feedback or anything else you would like to ask us." },
];

/** Native radio inputs: arrow keys, focus and screen-reader semantics come for free. */
export function EnquiryTypeSelector({ value, onChange }: { value: EnquiryType; onChange: (v: EnquiryType) => void }) {
  return (
    <fieldset>
      <legend className="mb-4 text-sm text-sky">What would you like to do?</legend>
      <div className="grid gap-4 md:grid-cols-3">
        {options.map((o) => (
          <label key={o.value} className="relative block cursor-pointer">
            <input type="radio" name="enquiry-type" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className={cn(
              "block h-full border p-5 transition-colors duration-base ease-cinematic peer-focus-visible:ring-2 peer-focus-visible:ring-saffron peer-focus-visible:ring-offset-4 peer-focus-visible:ring-offset-obsidian sm:p-6",
              value === o.value ? "border-saffron bg-charcoal" : "border-gold/30 hover:border-gold/70",
            )}>
              <span className="flex items-start justify-between gap-3">
                <span className="font-display text-2xl uppercase leading-none lg:text-[1.7rem]">{o.title}</span>
                <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border", value === o.value ? "border-saffron" : "border-gold/50")}>
                  {value === o.value && <span className="size-3 rounded-full bg-saffron" />}
                </span>
              </span>
              <span className="mt-3 block text-sm text-ivory/80">{o.text}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
