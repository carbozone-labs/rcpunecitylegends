"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/animations";
import { parseEnquiryType, type EnquiryType } from "@/lib/enquiry";
import { EnquiryTypeSelector } from "./EnquiryTypeSelector";
import { OfficialFormPanel } from "./OfficialFormPanel";

const panels: Record<EnquiryType, { title: string; text: string }> = {
  membership: {
    title: "Membership enquiry",
    text: "Tell us a little about yourself and your interest in LEGENDS. Sending an enquiry does not grant membership.",
  },
  partnership: {
    title: "Partnership enquiry",
    text: "Clubs, organizations and groups can start a conversation about working together. Sending an enquiry does not confirm a partnership.",
  },
  general: {
    title: "General enquiry",
    text: "Have a question or something to share? Send us a message and the team will get back to you.",
  },
};

/** Opens on the enquiry named in the link: /join?type=partnership#enquiry (membership is the default). */
export function JoinEnquiry() {
  const params = useSearchParams();
  const requested = parseEnquiryType(params.get("type"));
  const [type, setType] = useState<EnquiryType>(requested);
  useEffect(() => setType(requested), [requested]);

  const panel = panels[type];
  return (
    <div className="space-y-10">
      <EnquiryTypeSelector value={type} onChange={setType} />
      <div className="min-h-[18rem] border border-gold/25 p-6 sm:p-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <OfficialFormPanel type={type} title={panel.title} text={panel.text} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
