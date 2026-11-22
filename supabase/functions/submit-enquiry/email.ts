// Resend email notification for new enquiries. Pure functions plus one fetch call; nothing here can throw into the caller
// (sendNotification always resolves with a result object).

import type { CleanEnquiry } from "./validation.ts";

export type StoredEnquiry = CleanEnquiry & { id: string; created_at: string };

export type EmailConfig = { apiKey: string; from: string; to: string[] };
export type EmailResult = { status: "sent" } | { status: "skipped" | "failed"; error: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
// "Club Name <mail@domain.com>" or "mail@domain.com"
const FROM_RE = /^(?:[^<>\r\n]+<[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+>|[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+)$/;

/** Reads the three notification settings from Edge Function secrets. Returns an explanation instead of throwing. */
export function readEmailConfig(get: (name: string) => string | undefined): { ok: true; config: EmailConfig } | { ok: false; reason: string } {
  const apiKey = (get("RESEND_API_KEY") ?? "").trim();
  const from = (get("RESEND_FROM_EMAIL") ?? "").trim();
  const to = (get("NOTIFY_EMAIL_TO") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const missing = [!apiKey && "RESEND_API_KEY", !from && "RESEND_FROM_EMAIL", !to.length && "NOTIFY_EMAIL_TO"].filter(Boolean);
  if (missing.length) return { ok: false, reason: `Email not configured (missing: ${missing.join(", ")})` };
  if (!FROM_RE.test(from)) return { ok: false, reason: "RESEND_FROM_EMAIL is not a valid sender address" };
  if (to.some((t) => !EMAIL_RE.test(t))) return { ok: false, reason: "NOTIFY_EMAIL_TO contains an invalid address" };
  return { ok: true, config: { apiKey, from, to } };
}

const formatWhen = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export function renderEmail(e: StoredEnquiry): { subject: string; html: string; text: string } {
  const when = formatWhen(e.created_at);
  const subject = oneLine(`New ${e.enquiry_type} enquiry from ${e.full_name}`).slice(0, 200);

  const rows: [string, string][] = [
    ["Enquiry type", e.enquiry_type],
    ["Full name", e.full_name],
    ["Email", e.email],
    ["Phone", e.phone ?? ""],
    [e.enquiry_type === "Membership" ? "College / organisation" : "Organisation / club", e.organisation ?? ""],
    ["Current city", e.city ?? ""],
    ["Partnership type", e.partnership_type ?? ""],
    ["Subject", e.subject ?? ""],
  ];
  const filled = rows.filter(([, v]) => v);
  const messageLabel = e.enquiry_type === "Membership" ? "Why are you interested in joining?" : "Message";

  const rowHtml = filled
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #e3e9f4;width:38%;vertical-align:top;font-size:13px;color:#52607a">${esc(k)}</td>` +
        `<td style="padding:10px 16px;border-bottom:1px solid #e3e9f4;vertical-align:top;font-size:15px;color:#0a1b3e">${esc(v)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px;background:#f1f5fb;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d6dfef;border-radius:12px;overflow:hidden">
    <tr><td style="background:#0a1b3e;padding:22px 24px;border-bottom:4px solid #d6b064">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;letter-spacing:.5px">RC Pune City Legends</div>
      <div style="margin-top:4px;font-size:13px;color:#d6b064">New website enquiry</div>
    </td></tr>
    <tr><td style="padding:22px 24px 8px">
      <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:#fbf1d9;color:#7a5200;font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase">${esc(e.enquiry_type)} enquiry</div>
      <div style="margin-top:12px;font-size:13px;color:#52607a">Received ${esc(when)} (IST)</div>
    </td></tr>
    <tr><td style="padding:8px 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rowHtml}</table></td></tr>
    ${
      e.message
        ? `<tr><td style="padding:20px 24px 4px;font-size:13px;color:#52607a">${esc(messageLabel)}</td></tr>
    <tr><td style="padding:0 24px 20px"><div style="padding:14px 16px;background:#f6f8fc;border:1px solid #e3e9f4;border-radius:8px;font-size:15px;line-height:1.55;color:#0a1b3e;white-space:pre-wrap;word-break:break-word">${esc(e.message)}</div></td></tr>`
        : ""
    }
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #e3e9f4;font-size:12px;color:#7a869c;line-height:1.6">
      Enquiry ID: <span style="font-family:Consolas,Menlo,monospace">${esc(e.id)}</span><br>
      Reply to this email to answer ${esc(e.full_name)} directly. Track progress by changing the status in the Supabase Table Editor (enquiries).
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `New ${e.enquiry_type} enquiry: RC Pune City Legends`,
    `Received: ${when} (IST)`,
    `Enquiry ID: ${e.id}`,
    "",
    ...filled.map(([k, v]) => `${k}: ${v}`),
    ...(e.message ? ["", `${messageLabel}:`, e.message] : []),
    "",
    "Reply to this email to answer the sender directly.",
  ].join("\n");

  return { subject, html, text };
}

/** Sends the notification through Resend. Never throws. */
export async function sendNotification(
  cfg: EmailConfig,
  enquiry: StoredEnquiry,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 6000,
): Promise<EmailResult> {
  const { subject, html, text } = renderEmail(enquiry);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        // Resend ignores a repeat of the same key, so a retry can never send two emails for one enquiry
        "Idempotency-Key": `enquiry-${enquiry.id}`,
      },
      body: JSON.stringify({ from: cfg.from, to: cfg.to, reply_to: enquiry.email, subject, html, text }),
      signal: controller.signal,
    });
    if (res.ok) return { status: "sent" };
    const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
    return { status: "failed", error: `Resend responded ${res.status}${body ? `: ${body}` : ""}`.slice(0, 480) };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { status: "failed", error: aborted ? `Resend request timed out after ${timeoutMs} ms` : "Could not reach Resend" };
  } finally {
    clearTimeout(timer);
  }
}
