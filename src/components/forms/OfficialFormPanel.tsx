import { EnquiryForm } from "./EnquiryForm";
import type { EnquiryType } from "@/lib/enquiry";

type Props = { type: EnquiryType; title: string; text: string; note?: React.ReactNode };

/** The club's enquiry panel: heading, short intro and the native enquiry form. Enquiries are handled on this website. */
export function OfficialFormPanel({ type, title, text, note }: Props) {
  return (
    <div>
      <h3 className="font-display text-3xl uppercase sm:text-4xl">{title}</h3>
      <p className="mt-3 max-w-prose text-ivory/86">{text}</p>
      {note && <div className="mt-3 max-w-prose text-sm text-ivory/78">{note}</div>}
      <EnquiryForm type={type} className="mt-8" />
    </div>
  );
}
