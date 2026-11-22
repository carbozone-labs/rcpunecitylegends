import Link from "next/link";
import { contactHref, partnerHref, joinHref } from "@/data/club";
import type { EnquiryType } from "@/lib/enquiry";

const hrefs: Record<EnquiryType, string> = {
  membership: `${joinHref}?type=membership#enquiry`,
  partnership: partnerHref,
  general: contactHref,
};

/** Plain text link to the on-site enquiry form of the chosen type, for footers and lists. No external redirect. */
export function EnquiryFormLink({ type = "general", children, className }: { type?: EnquiryType; children: React.ReactNode; className?: string }) {
  return (
    <Link href={hrefs[type]} className={className}>
      {children}
    </Link>
  );
}
