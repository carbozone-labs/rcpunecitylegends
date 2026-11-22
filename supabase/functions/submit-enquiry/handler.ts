// Request handling for `submit-enquiry`, with every outside dependency injected so the whole flow
// (CORS, spam checks, rate limits, validation, storage, email) can be tested without Supabase or Resend.

import { isEnquiryKind, validateFields, type CleanEnquiry, type FieldErrors } from "./validation.ts";
import { readEmailConfig, type EmailConfig, type EmailResult, type StoredEnquiry } from "./email.ts";

export const SUCCESS_MESSAGE =
  "Thank you for reaching out to RC Pune City Legends. Your enquiry has been submitted successfully. Our team will connect with you soon.";

export type InsertRow = CleanEnquiry & { client_submission_id: string; ip_hash: string | null };
export type InsertResult =
  | { kind: "created"; id: string; created_at: string }
  | { kind: "duplicate"; id: string }
  | { kind: "error"; message: string };

export interface EnquiryStore {
  findBySubmissionId(id: string): Promise<{ id: string } | null>;
  countSince(filter: { ipHash?: string; email?: string }, sinceIso: string): Promise<number>;
  insert(row: InsertRow): Promise<InsertResult>;
  updateNotification(id: string, patch: { notification_status: "sent" | "failed" | "skipped"; notification_error: string | null; notified_at: string | null }): Promise<void>;
}

export interface Deps {
  getEnv: (name: string) => string | undefined;
  store: EnquiryStore;
  sendEmail: (cfg: EmailConfig, enquiry: StoredEnquiry) => Promise<EmailResult>;
  now?: () => Date;
  log?: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

// Local development is always allowed. Production origins are added through the ALLOWED_ORIGINS secret.
const DEFAULT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const MAX_BODY_BYTES = 20_000;
const MIN_FILL_MS = 1500; // faster than this is a script, not a person
export const LIMITS_PER_HOUR = { perIp: 5, perEmail: 3, global: 100 };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function allowedOrigins(getEnv: Deps["getEnv"]): string[] {
  const extra = (getEnv("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => s && s !== "*"); // a wildcard is deliberately not supported
  return [...DEFAULT_ORIGINS, ...extra];
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function clientIp(req: Request): string | null {
  // Prefer headers set by the platform edge (cannot be forged by the visitor); fall back to the first forwarded hop.
  const h = req.headers;
  const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "";
  const trimmed = ip.trim();
  return trimmed && trimmed.length <= 64 ? trimmed : null;
}

export function createHandler(deps: Deps) {
  const log = deps.log ?? console;
  const now = deps.now ?? (() => new Date());

  return async function handle(req: Request): Promise<Response> {
    const origin = req.headers.get("origin");
    const allowed = allowedOrigins(deps.getEnv);
    const originOk = origin === null || allowed.includes(origin);

    const corsHeaders: Record<string, string> = {
      Vary: "Origin",
      ...(origin && originOk
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
            "Access-Control-Max-Age": "86400",
          }
        : {}),
    };
    const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders, ...extra } });
    const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
      reply({ ok: false, code, message, ...extra }, status, headers);

    if (!originOk) return fail(403, "origin_not_allowed", "This website is not allowed to send enquiries.");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return fail(405, "method_not_allowed", "Only POST is supported.", {}, { Allow: "POST, OPTIONS" });
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return fail(415, "unsupported_media_type", "Send the enquiry as JSON.");

    // --- Body: size-limited JSON ---------------------------------------------------------------------------------
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES) return fail(413, "payload_too_large", "That message is too large.");
    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return fail(400, "invalid_request", "The request could not be read.");
    }
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail(413, "payload_too_large", "That message is too large.");
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      body = parsed as Record<string, unknown>;
    } catch {
      return fail(400, "invalid_json", "The request was not valid JSON.");
    }

    // --- Spam protection -----------------------------------------------------------------------------------------
    // 1. Honeypot: the field is invisible to people. A bot that fills it gets a convincing "success" and nothing is stored.
    if (typeof body.hp === "string" && body.hp.trim() !== "") {
      log.warn("[submit-enquiry] honeypot triggered; submission discarded");
      return reply({ ok: true, message: SUCCESS_MESSAGE });
    }

    const kind = body.type;
    if (!isEnquiryKind(kind)) return fail(400, "invalid_type", "Unknown enquiry type.");

    const submissionId = body.clientSubmissionId;
    if (typeof submissionId !== "string" || !UUID_RE.test(submissionId)) return fail(400, "invalid_request", "The request is missing a valid submission id.");

    // 2. Time trap: a person needs more than a moment to fill in a form.
    const elapsed = body.elapsedMs;
    if (typeof elapsed !== "number" || !Number.isFinite(elapsed)) return fail(400, "invalid_request", "The request is incomplete.");
    if (elapsed < MIN_FILL_MS) return fail(400, "too_fast", "That was very quick. Please review your details and submit again.");

    // --- Validation ----------------------------------------------------------------------------------------------
    const result = validateFields(kind, body.fields);
    if (!result.ok) return fail(400, "validation_failed", result.message, { fieldErrors: result.fieldErrors satisfies FieldErrors });
    const data = result.data;

    try {
      // --- Retry safety: the same submission id is only ever stored once ------------------------------------------
      const existing = await deps.store.findBySubmissionId(submissionId);
      if (existing) return reply({ ok: true, id: existing.id, message: SUCCESS_MESSAGE });

      // --- Rate limiting ---------------------------------------------------------------------------------------------
      const since = new Date(now().getTime() - 3_600_000).toISOString();
      const ip = clientIp(req);
      const salt = deps.getEnv("IP_HASH_SALT") || deps.getEnv("SUPABASE_SERVICE_ROLE_KEY") || "rc-pune-city-legends";
      const ipHash = ip ? await hashIp(ip, salt) : null;
      const retryHeaders = { "Retry-After": "3600" };
      const tooMany = (message: string) => fail(429, "rate_limited", message, {}, retryHeaders);

      if (ipHash && (await deps.store.countSince({ ipHash }, since)) >= LIMITS_PER_HOUR.perIp)
        return tooMany("You have sent several enquiries recently. Please wait a while before sending another.");
      if ((await deps.store.countSince({ email: data.email }, since)) >= LIMITS_PER_HOUR.perEmail)
        return tooMany("We have already received several enquiries from this email address. Please wait a while before sending another.");
      if ((await deps.store.countSince({}, since)) >= LIMITS_PER_HOUR.global)
        return tooMany("We are receiving a very high number of enquiries right now. Please try again in a little while.");

      // --- Store -----------------------------------------------------------------------------------------------------
      const inserted = await deps.store.insert({ ...data, client_submission_id: submissionId, ip_hash: ipHash });
      if (inserted.kind === "duplicate") return reply({ ok: true, id: inserted.id, message: SUCCESS_MESSAGE });
      if (inserted.kind === "error") {
        log.error("[submit-enquiry] storing the enquiry failed:", inserted.message);
        return fail(500, "storage_failed", "We could not save your enquiry. Please try again in a moment.");
      }

      // --- Email notification (never affects the response: the enquiry is already safely stored) ----------------------
      await notify(deps, log, { ...data, id: inserted.id, created_at: inserted.created_at });

      return reply({ ok: true, id: inserted.id, message: SUCCESS_MESSAGE });
    } catch (err) {
      log.error("[submit-enquiry] unexpected error:", err instanceof Error ? err.message : "unknown");
      return fail(500, "internal_error", "Something went wrong. Please try again in a moment.");
    }
  };
}

async function notify(deps: Deps, log: NonNullable<Deps["log"]>, enquiry: StoredEnquiry): Promise<void> {
  let status: "sent" | "failed" | "skipped" = "skipped";
  let error: string | null = null;
  try {
    const cfg = readEmailConfig(deps.getEnv);
    if (!cfg.ok) {
      error = cfg.reason;
      log.warn(`[submit-enquiry] ${cfg.reason}; enquiry ${enquiry.id} stored without a notification`);
    } else {
      const sent = await deps.sendEmail(cfg.config, enquiry);
      status = sent.status === "sent" ? "sent" : sent.status;
      error = sent.status === "sent" ? null : sent.error;
      if (sent.status !== "sent") log.error(`[submit-enquiry] notification for ${enquiry.id} failed: ${sent.status === "failed" ? sent.error : ""}`);
    }
  } catch (err) {
    status = "failed";
    error = "Unexpected error while sending the notification";
    log.error(`[submit-enquiry] notification for ${enquiry.id} threw:`, err instanceof Error ? err.message : "unknown");
  }
  try {
    await deps.store.updateNotification(enquiry.id, {
      notification_status: status,
      notification_error: error ? error.slice(0, 480) : null,
      notified_at: status === "sent" ? new Date().toISOString() : null,
    });
  } catch (err) {
    // The enquiry itself is safe. Only the bookkeeping failed.
    log.error(`[submit-enquiry] could not record notification status for ${enquiry.id}:`, err instanceof Error ? err.message : "unknown");
  }
}
