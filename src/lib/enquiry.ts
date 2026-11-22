/**
 * Native enquiry system: shared types, field rules, validation and the submission client.
 *
 * The browser validates for a good experience; the Supabase Edge Function (supabase/functions/submit-enquiry)
 * validates again and is the only thing that is trusted. KEEP THE RULES IN THIS FILE IN SYNC WITH
 * supabase/functions/submit-enquiry/validation.ts (limits, patterns, partnership types).
 *
 * Only two public values are used here: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * No secret ever reaches the browser.
 */

export type EnquiryType = "membership" | "partnership" | "general";

export const ENQUIRY_TYPES: readonly EnquiryType[] = ["membership", "partnership", "general"];

export const PARTNERSHIP_TYPES = [
  "Event Partnership",
  "Sponsorship",
  "Community Collaboration",
  "Corporate Partnership",
  "Other",
] as const;

export const SUCCESS_MESSAGE =
  "Thank you for reaching out to RC Pune City Legends. Your enquiry has been submitted successfully. Our team will connect with you soon.";

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
export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const emptyValues = (): FormValues => ({
  fullName: "",
  email: "",
  phone: "",
  organisation: "",
  city: "",
  partnershipType: "",
  subject: "",
  message: "",
});

/** Which fields each enquiry uses, and which of them are required. */
export const REQUIRED: Record<EnquiryType, readonly FieldName[]> = {
  membership: ["fullName", "email", "phone"],
  partnership: ["fullName", "organisation", "email", "phone", "partnershipType", "message"],
  general: ["fullName", "email", "subject", "message"],
};
export const USED: Record<EnquiryType, readonly FieldName[]> = {
  membership: ["fullName", "email", "phone", "city", "organisation", "message"],
  partnership: ["fullName", "organisation", "email", "phone", "partnershipType", "message"],
  general: ["fullName", "email", "phone", "subject", "message"],
};

export const parseEnquiryType = (value: string | null | undefined): EnquiryType =>
  ENQUIRY_TYPES.includes(value as EnquiryType) ? (value as EnquiryType) : "membership";

// ---------------------------------------------------------------------------------------------------------------------
// Normalising and validating
// ---------------------------------------------------------------------------------------------------------------------

// Control characters other than tab / newline are never wanted in a form field.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Single-line text: no control characters, whitespace collapsed, trimmed. */
export const cleanLine = (v: string) => v.normalize("NFC").replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
/** Multi-line text: no control characters, line breaks kept (max one blank line in a row), trimmed. */
export const cleanText = (v: string) =>
  v.normalize("NFC").replace(CONTROL_CHARS, "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

/** "+91 98765-43210" -> "+919876543210". Spaces, dashes, dots and brackets are allowed on input. */
export const normalisePhone = (v: string) => v.replace(/[\s().-]/g, "");

// Practical email check: one @, no spaces, a dotted domain. (Deliverability is proven by the club replying, not by a regex.)
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export const isValidEmail = (v: string) => v.length <= LIMITS.email.max && EMAIL.test(v) && !v.includes("..");

// Optional leading +, then 7 to 15 digits (covers Indian 10-digit numbers and international numbers).
export const isValidPhone = (v: string) => {
  const p = normalisePhone(v);
  return /^\+?[0-9]+$/.test(p) && p.replace("+", "").length >= LIMITS.phone.minDigits && p.replace("+", "").length <= LIMITS.phone.maxDigits;
};

const msg = {
  required: (label: string) => `${label} is required.`,
  tooShort: (label: string, n: number) => `${label} must be at least ${n} characters.`,
  tooLong: (label: string, n: number) => `${label} must be ${n} characters or fewer.`,
};

export const LABELS: Record<EnquiryType, Record<FieldName, string>> = {
  membership: {
    fullName: "Full name",
    email: "Email address",
    phone: "Phone number",
    city: "Current city",
    organisation: "College / organisation",
    partnershipType: "Partnership type",
    subject: "Subject",
    message: "Why are you interested in joining?",
  },
  partnership: {
    fullName: "Full name",
    organisation: "Organisation / club name",
    email: "Email address",
    phone: "Phone number",
    partnershipType: "Partnership type",
    city: "Current city",
    subject: "Subject",
    message: "Message",
  },
  general: {
    fullName: "Full name",
    email: "Email address",
    phone: "Phone number",
    subject: "Subject",
    message: "Message",
    organisation: "Organisation",
    city: "Current city",
    partnershipType: "Partnership type",
  },
};

/** Returns an error message for each invalid field (an empty object means the form is valid). */
export function validateEnquiry(type: EnquiryType, raw: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const labels = LABELS[type];
  const required = REQUIRED[type];
  const used = USED[type];

  for (const field of used) {
    const isMulti = field === "message";
    const value = isMulti ? cleanText(raw[field]) : cleanLine(raw[field]);
    const label = labels[field];
    if (!value) {
      if (required.includes(field)) errors[field] = msg.required(label);
      continue;
    }
    switch (field) {
      case "fullName":
        if (value.length < LIMITS.fullName.min) errors[field] = msg.tooShort(label, LIMITS.fullName.min);
        else if (value.length > LIMITS.fullName.max) errors[field] = msg.tooLong(label, LIMITS.fullName.max);
        break;
      case "email":
        if (!isValidEmail(value)) errors[field] = "Please enter a valid email address, for example name@example.com.";
        break;
      case "phone":
        if (raw.phone.length > LIMITS.phone.rawMax || !isValidPhone(value))
          errors[field] = "Please enter a valid phone number (7 to 15 digits; a leading + is allowed).";
        break;
      case "organisation":
        if (value.length > LIMITS.organisation.max) errors[field] = msg.tooLong(label, LIMITS.organisation.max);
        break;
      case "city":
        if (value.length > LIMITS.city.max) errors[field] = msg.tooLong(label, LIMITS.city.max);
        break;
      case "partnershipType":
        if (!(PARTNERSHIP_TYPES as readonly string[]).includes(value)) errors[field] = "Please choose one of the partnership types.";
        break;
      case "subject":
        if (value.length < LIMITS.subject.min) errors[field] = msg.tooShort(label, LIMITS.subject.min);
        else if (value.length > LIMITS.subject.max) errors[field] = msg.tooLong(label, LIMITS.subject.max);
        break;
      case "message":
        if (required.includes(field) && value.length < LIMITS.message.min) errors[field] = msg.tooShort(label, LIMITS.message.min);
        else if (value.length > LIMITS.message.max) errors[field] = msg.tooLong(label, LIMITS.message.max);
        else if ((value.match(/https?:\/\/|www\./gi) ?? []).length > LIMITS.maxLinksInMessage) errors[field] = `Please include at most ${LIMITS.maxLinksInMessage} links in your message.`;
        break;
    }
  }
  return errors;
}

/** The cleaned fields that are actually sent for this enquiry type. */
export function cleanedFields(type: EnquiryType, raw: FormValues): Partial<FormValues> {
  const out: Partial<FormValues> = {};
  for (const field of USED[type]) {
    const value = field === "message" ? cleanText(raw[field]) : cleanLine(raw[field]);
    if (value) out[field] = field === "phone" ? normalisePhone(value) : value;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------------------------------------------------

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** True when the two public Supabase values are present (set them in .env.local; see SETUP_ENQUIRY_SYSTEM.md). */
export const enquiryServiceConfigured = (): boolean => /^https:\/\/.+|^http:\/\/(localhost|127\.0\.0\.1)/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

export type SubmitPayload = {
  type: EnquiryType;
  values: FormValues;
  /** Random id made per attempt; the server ignores a repeat of the same id (safe retries, no duplicates). */
  clientSubmissionId: string;
  /** Milliseconds between the form appearing and submit; very fast posts are treated as bots. */
  elapsedMs: number;
  /** Honeypot: real visitors never fill this in. */
  honeypot: string;
};

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors; retryable: boolean };

const GENERIC_ERROR = "Something went wrong and your enquiry was not sent. Your answers are still here, so please try again in a moment.";

export async function submitEnquiry(payload: SubmitPayload): Promise<SubmitResult> {
  if (!enquiryServiceConfigured()) {
    console.error("[enquiry] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. See SETUP_ENQUIRY_SYSTEM.md.");
    return { ok: false, retryable: false, message: "Enquiries are temporarily unavailable on this website. Please try again later." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        type: payload.type,
        clientSubmissionId: payload.clientSubmissionId,
        elapsedMs: payload.elapsedMs,
        hp: payload.honeypot,
        fields: cleanedFields(payload.type, payload.values),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    let body: { ok?: boolean; message?: string; fieldErrors?: FieldErrors } | null = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    // Success is shown only when the server says the enquiry was stored.
    if (res.ok && body?.ok === true) return { ok: true };

    if (res.status === 400 && body?.fieldErrors) return { ok: false, retryable: true, message: body.message ?? "Please check the highlighted fields.", fieldErrors: body.fieldErrors };
    if (res.status === 429) return { ok: false, retryable: true, message: body?.message ?? "You have sent several enquiries recently. Please wait a little while before trying again." };
    return { ok: false, retryable: true, message: body?.message && res.status < 500 ? body.message : GENERIC_ERROR };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      message: timedOut
        ? "The request took too long. Please check your connection and try again. Your answers are still here."
        : "We could not reach the server. Please check your internet connection and try again. Your answers are still here.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** crypto.randomUUID needs a secure context (https or localhost); fall back for anything else. */
export function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
