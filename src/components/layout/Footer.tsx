import Image from "@/components/ui/SiteImage";
import Link from "next/link";
import { club, nav } from "@/data/club";
import { EnquiryFormLink } from "@/components/forms/EnquiryFormLink";
import { Container } from "@/components/ui/Container";
import { BackToTop } from "./BackToTop";

export function Footer() {
  const { email, phone, address, socials } = club.contact;
  return (
    <footer className="relative overflow-hidden pb-28 pt-20 md:pb-12">
      <Container>
        <div className="border hairline p-8 md:p-12">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="flex items-start gap-4">
              <Image src="/images/logo/legends-logo-sm.webp" alt="Rotaract Club of Pune City Legends logo" width={64} height={64} className="size-16" loading="lazy" />
              <div>
                <p className="font-display text-2xl tracking-wider">Legends</p>
                <p className="mt-1 text-sm text-ivory/84">{club.name}</p>
                <p className="mt-3 font-deva text-sky">{club.theme}</p>
                <p className="mt-1 text-xs text-ivory/72">Chartered {club.chartered}</p>
              </div>
            </div>

            <nav aria-label="Footer">
              <p className="mb-4 text-sm font-semibold text-ivory/90">Explore</p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                {[...nav.slice(0, 2), { id: "journey", label: "Our Journey", href: "/journey" }, ...nav.slice(2)].map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="inline-flex min-h-11 min-w-11 items-center text-sm text-ivory/80 transition-colors hover:text-saffron">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="mb-4 text-sm font-semibold text-ivory/90">Contact</p>
              <ul className="mb-3">
                <li><EnquiryFormLink type="general" className="inline-flex min-h-11 items-center text-sm font-semibold text-saffron underline-offset-4 hover:underline">Send an enquiry</EnquiryFormLink></li>
                <li><EnquiryFormLink type="membership" className="inline-flex min-h-11 items-center text-sm text-ivory/80 transition-colors hover:text-saffron">Membership enquiry</EnquiryFormLink></li>
                <li><EnquiryFormLink type="partnership" className="inline-flex min-h-11 items-center text-sm text-ivory/80 transition-colors hover:text-saffron">Partnership enquiry</EnquiryFormLink></li>
              </ul>
              {email || phone || address || socials.length ? (
                <ul className="space-y-2 text-sm text-ivory/80">
                  {email && <li><a className="hover:text-saffron" href={`mailto:${email}`}>{email}</a></li>}
                  {phone && <li><a className="hover:text-saffron" href={`tel:${phone}`}>{phone}</a></li>}
                  {address && <li><address className="not-italic">{address}</address></li>}
                  {socials.map((s) => (
                    <li key={s.href}>
                      <a className="hover:text-saffron" href={s.href} target="_blank" rel="noopener noreferrer">
                        {s.label}{s.handle ? ` (${s.handle})` : ""}<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <p aria-hidden className="footer-wordmark mt-10 select-none text-center font-display text-[clamp(3rem,17vw,14rem)] leading-none">LEGENDS</p>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-ivory/74">© {new Date().getFullYear()} {club.name}. All rights reserved.</p>
          <BackToTop />
        </div>
      </Container>
    </footer>
  );
}
