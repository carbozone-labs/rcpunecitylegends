// Server-side validation and sanitising for the `submit-enquiry` Edge Function.
// KEEP IN SYNC with src/lib/enquiry.ts (the browser copy of these rules). This copy is the one that is trusted.
// Pure TypeScript, no imports, so it can be unit-tested anywhere.

export type EnquiryKind = "membership" | "partnership" | "general";
export type DbEnquiryType = "Membership" | "Partnership" | "General";

export const TYPE_LABEL: Record<EnquiryKind, DbEnquiryType> = {
  membership: "Membership",
  partnership: "Partnership",
  general: "General",
};

export const PARTNERSHIP_TYPES = ["Event Partnership", "Sponsorship", "Community Collaboration", "Corporate Partnership", "Other"] as const;

export const LIMITS = {
  fullName: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { rawMax: 20, minDigits: 7, maxDigits: 15 },
  organisation: { max: 150 },
  city: { max: 100 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 2000 },
  maxLinksInMessage: 2,
} as const;

export type FieldName = "fullName" | "email" | "phone" | "organisation" | "city" | "partnershipType" | "subject" | "message";
export type FieldErrors = Partial<Record<FieldName, string>>;

const REQUIRED: Record<EnquiryKind, readonly FieldName[]> = {
  membership: ["fullName", "email", "phone"],
  partnership: ["fullName", "organisation", "email", "phone", "partnershipType", "message"],
  general: ["fullName", "email", "subject", "message"],
};
const USED: Record<EnquiryKind, readonly FieldName[]> = {
  membership: ["fullName", "email", "phone", "city", "organisation", "message"],
  partnership: ["fullName", "organisation", "email", "phone", "partnershipType", "message"],
  general: ["fullName", "email", "phone", "subject", "message"],
};

export type CleanEnquiry = {
  enquiry_type: DbEnquiryType;
  full_name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  city: string | null;
  partnership_type: string | null;
  subject: string | null;
  message: string | null;
};

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// Characters that can reorder or hide text (bidi overrides, zero-width): never legitimate in these fields.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

export const cleanLine = (v: string) => v.normalize("NFC").replace(CONTROL_CHARS, "").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
export const cleanText = (v: string) =>
  v.normalize("NFC").replace(CONTROL_CHARS, "").replace(INVISIBLE, "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
export const normalisePhone = (v: string) => v.replace(/[\s().-]/g, "");

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export const isValidEmail = (v: string) => v.length <= LIMITS.email.max && EMAIL.test(v) && !v.includes("..");
export const isValidPhone = (v: string) => {
  const p = normalisePhone(v);
  const digits = p.replace("+", "");
  return /^\+?[0-9]+$/.test(p) && digits.length >= LIMITS.phone.minDigits && digits.length <= LIMITS.phone.maxDigits;
};

const LABEL: Record<FieldName, string> = {
  fullName: "Full name",
  email: "Email address",
  phone: "Phone number",
  organisation: "Organisation",
  city: "Current city",
  partnershipType: "Partnership type",
  subject: "Subject",
  message: "Message",
};

export type ValidationResult = { ok: true; data: CleanEnquiry } | { ok: false; fieldErrors: FieldErrors; message: string };

export function isEnquiryKind(v: unknown): v is EnquiryKind {
  return v === "membership" || v === "partnership" || v === "general";
}

/** Validates the `fields` object of a submission for the given enquiry kind. Unknown fields are ignored (allow-list). */
export function validateFields(kind: EnquiryKind, rawFields: unknown): ValidationResult {
  const errors: FieldErrors = {};
  const src: Record<string, unknown> = rawFields && typeof rawFields === "object" && !Array.isArray(rawFields) ? (rawFields as Record<string, unknown>) : {};
  const value: Partial<Record<FieldName, string>> = {};

  for (const field of USED[kind]) {
    const raw = src[field];
    if (raw === undefined || raw === null || raw === "") {
      if (REQUIRED[kind].includes(field)) errors[field] = `${LABEL[field]} is required.`;
      continue;
    }
    if (typeof raw !== "string") {
      errors[field] = `${LABEL[field]} must be text.`;
      continue;
    }
    // Hard cap before any processing so a huge value cannot waste CPU
    if (raw.length > 5000) {
      errors[field] = `${LABEL[field]} is too long.`;
      continue;
    }
    const v = field === "message" ? cleanText(raw) : cleanLine(raw);
    if (!v) {
      if (REQUIRED[kind].includes(field)) errors[field] = `${LABEL[field]} is required.`;
      continue;
    }
    value[field] = field === "phone" ? normalisePhone(v) : field === "email" ? v.toLowerCase() : v;
  }

  const check = (f: FieldName, bad: boolean, text: string) => {
    if (value[f] !== undefined && !errors[f] && bad) errors[f] = text;
  };
  check("fullName", (value.fullName?.length ?? 0) < LIMITS.fullName.min || (value.fullName?.length ?? 0) > LIMITS.fullName.max, `Full name must be ${LIMITS.fullName.min} to ${LIMITS.fullName.max} characters.`);
  check("email", !isValidEmail(value.email ?? ""), "Please enter a valid email address.");
  check("phone", !isValidPhone(value.phone ?? "") || String(src.phone ?? "").length > LIMITS.phone.rawMax, "Please enter a valid phone number (7 to 15 digits; a leading + is allowed).");
  check("organisation", (value.organisation?.length ?? 0) > LIMITS.organisation.max, `Organisation must be ${LIMITS.organisation.max} characters or fewer.`);
  check("city", (value.city?.length ?? 0) > LIMITS.city.max, `Current city must be ${LIMITS.city.max} characters or fewer.`);
  check("partnershipType", !(PARTNERSHIP_TYPES as readonly string[]).includes(value.partnershipType ?? ""), "Please choose one of the partnership types.");
  check("subject", (value.subject?.length ?? 0) < LIMITS.subject.min || (value.subject?.length ?? 0) > LIMITS.subject.max, `Subject must be ${LIMITS.subject.min} to ${LIMITS.subject.max} characters.`);
  if (value.message !== undefined && !errors.message) {
    const len = value.message.length;
    if (REQUIRED[kind].includes("message") && len < LIMITS.message.min) errors.message = `Message must be at least ${LIMITS.message.min} characters.`;
    else if (len > LIMITS.message.max) errors.message = `Message must be ${LIMITS.message.max} characters or fewer.`;
    else if ((value.message.match(/https?:\/\/|www\./gi) ?? []).length > LIMITS.maxLinksInMessage) errors.message = `Please include at most ${LIMITS.maxLinksInMessage} links in your message.`;
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors, message: "Please check the highlighted fields and try again." };

  return {
    ok: true,
    data: {
      enquiry_type: TYPE_LABEL[kind],
      full_name: value.fullName!,
      email: value.email!,
      phone: value.phone ?? null,
      organisation: value.organisation ?? null,
      city: value.city ?? null,
      partnership_type: value.partnershipType ?? null,
      subject: value.subject ?? null,
      message: value.message ?? null,
    },
  };
}
