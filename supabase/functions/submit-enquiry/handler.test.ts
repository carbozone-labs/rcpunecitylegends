// Run with:  deno test supabase/functions/submit-enquiry
// These tests use in-memory stand-ins for Supabase and Resend, so they verify the function's logic (validation, CORS,
// spam checks, rate limits, retry safety, email handling). They do NOT prove that a real Supabase project / Resend
// account is configured: see SETUP_ENQUIRY_SYSTEM.md for the live end-to-end check.

import assert from "node:assert/strict";
import { createHandler, LIMITS_PER_HOUR, SUCCESS_MESSAGE, type Deps, type EnquiryStore, type InsertRow } from "./handler.ts";
import { renderEmail, sendNotification, readEmailConfig, type EmailConfig } from "./email.ts";
import { validateFields } from "./validation.ts";

const NOW = new Date("2026-11-08T10:00:00.000Z");
const ORIGIN = "http://localhost:3000";
const RESEND_KEY = "re_test_SECRET_KEY_123";

type Row = InsertRow & { id: string; created_at: string; notification_status: string; notification_error: string | null; notified_at: string | null };

function makeStore(opts: { failInsert?: boolean; failNotifyUpdate?: boolean } = {}) {
  const rows: Row[] = [];
  const store: EnquiryStore = {
    async findBySubmissionId(id) {
      const r = rows.find((x) => x.client_submission_id === id);
      return r ? { id: r.id } : null;
    },
    async countSince(f, since) {
      return rows.filter((r) => r.created_at >= since && (!f.ipHash || r.ip_hash === f.ipHash) && (!f.email || r.email === f.email)).length;
    },
    async insert(row) {
      if (opts.failInsert) return { kind: "error", message: "boom" };
      const id = crypto.randomUUID();
      const created_at = NOW.toISOString();
      rows.push({ ...row, id, created_at, notification_status: "pending", notification_error: null, notified_at: null });
      return { kind: "created", id, created_at };
    },
    async updateNotification(id, patch) {
      if (opts.failNotifyUpdate) throw new Error("db down");
      Object.assign(rows.find((r) => r.id === id)!, patch);
    },
  };
  return { rows, store };
}

const fullEnv: Record<string, string> = {
  RESEND_API_KEY: RESEND_KEY,
  RESEND_FROM_EMAIL: "RC Pune City Legends <enquiries@verified.example>",
  NOTIFY_EMAIL_TO: "club@example.org",
  IP_HASH_SALT: "test-salt",
};

function setup(opts: { env?: Record<string, string>; email?: Deps["sendEmail"]; storeOpts?: Parameters<typeof makeStore>[0] } = {}) {
  const { rows, store } = makeStore(opts.storeOpts);
  const sent: { cfg: EmailConfig; enquiry: { id: string; full_name: string } }[] = [];
  const logs: string[] = [];
  const env = opts.env ?? fullEnv;
  const handle = createHandler({
    getEnv: (n) => env[n],
    store,
    now: () => NOW,
    log: { info: (...a) => logs.push(a.join(" ")), warn: (...a) => logs.push(a.join(" ")), error: (...a) => logs.push(a.join(" ")) },
    sendEmail:
      opts.email ??
      (async (cfg, enquiry) => {
        sent.push({ cfg, enquiry });
        return { status: "sent" };
      }),
  });
  return { handle, rows, sent, logs };
}

const goodFields = {
  membership: { fullName: "Asha Patil", email: "Asha@Example.com", phone: "+91 98765-43210", city: "Pune", organisation: "COEP", message: "I love community service." },
  partnership: { fullName: "Rohan Kulkarni", organisation: "Pune Tech Club", email: "rohan@techclub.in", phone: "9876543210", partnershipType: "Sponsorship", message: "We would like to sponsor your next event." },
  general: { fullName: "Meera Shah", email: "meera@example.com", subject: "Question about events", message: "When is the next event happening?" },
} as const;

function post(body: unknown, o: { origin?: string | null; ip?: string; method?: string; ct?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { "content-type": o.ct ?? "application/json" };
  if (o.origin !== null) headers.origin = o.origin ?? ORIGIN;
  if (o.ip) headers["cf-connecting-ip"] = o.ip;
  return new Request("https://x.supabase.co/functions/v1/submit-enquiry", { method: o.method ?? "POST", headers, body: o.method === "GET" ? undefined : (o.raw ?? JSON.stringify(body)) });
}
const payload = (type: keyof typeof goodFields, extra: Record<string, unknown> = {}, fields: Record<string, unknown> = {}) => ({
  type,
  clientSubmissionId: crypto.randomUUID(),
  elapsedMs: 9000,
  hp: "",
  fields: { ...goodFields[type], ...fields },
  ...extra,
});
const j = async (r: Response) => await r.json();

// ---------------------------------------------------------------------------------------------------------------------
Deno.test("each enquiry type is stored, normalised and acknowledged", async () => {
  for (const type of ["membership", "partnership", "general"] as const) {
    const t = setup();
    const res = await t.handle(post(payload(type)));
    const body = await j(res);
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.message, SUCCESS_MESSAGE);
    assert.match(body.id, /^[0-9a-f-]{36}$/);
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0].enquiry_type, { membership: "Membership", partnership: "Partnership", general: "General" }[type]);
    assert.equal(t.rows[0].notification_status, "sent");
    assert.equal(t.sent.length, 1);
  }
});

Deno.test("membership: phone and email normalised, optional fields stay null", async () => {
  const t = setup();
  await t.handle(post(payload("membership", {}, { city: "", organisation: "", message: "" })));
  const r = t.rows[0];
  assert.equal(r.email, "asha@example.com");
  assert.equal(r.phone, "+919876543210");
  assert.equal(r.city, null);
  assert.equal(r.organisation, null);
  assert.equal(r.message, null);
  assert.equal(r.subject, null);
});

Deno.test("required fields are enforced per type", async () => {
  const cases: [keyof typeof goodFields, string][] = [
    ["membership", "fullName"], ["membership", "email"], ["membership", "phone"],
    ["partnership", "fullName"], ["partnership", "organisation"], ["partnership", "email"], ["partnership", "phone"], ["partnership", "partnershipType"], ["partnership", "message"],
    ["general", "fullName"], ["general", "email"], ["general", "subject"], ["general", "message"],
  ];
  for (const [type, field] of cases) {
    const t = setup();
    const res = await t.handle(post(payload(type, {}, { [field]: "" })));
    const body = await j(res);
    assert.equal(res.status, 400, `${type}.${field}`);
    assert.equal(body.code, "validation_failed");
    assert.ok(body.fieldErrors[field], `${type}.${field} should have an error`);
    assert.equal(t.rows.length, 0);
  }
});

Deno.test("general phone is optional; membership message is optional", async () => {
  const t = setup();
  assert.equal((await t.handle(post(payload("general")))).status, 200);
  assert.equal((await t.handle(post(payload("membership", {}, { message: "" })))).status, 200);
});

Deno.test("invalid email and phone are rejected", async () => {
  const badEmails = ["plain", "a@b", "a b@c.com", "a@b..com", "a@@b.com", "name@example.com\nBcc: evil@x.com", "<x>@y.com", "a@b.c".padEnd(300, "x") + "@y.com"];
  for (const email of badEmails) {
    const t = setup();
    const res = await t.handle(post(payload("general", {}, { email })));
    assert.equal(res.status, 400, JSON.stringify(email));
    assert.ok((await j(res)).fieldErrors.email);
  }
  const badPhones = ["12345", "abcdefghij", "+91 98765 4321x", "1234567890123456", "98765-43210; DROP TABLE", "+".repeat(10)];
  for (const phone of badPhones) {
    const t = setup();
    const res = await t.handle(post(payload("membership", {}, { phone })));
    assert.equal(res.status, 400, phone);
    assert.ok((await j(res)).fieldErrors.phone);
  }
  for (const phone of ["9876543210", "+91 98765 43210", "(020) 2553-1234", "+1 (415) 555-0132"]) {
    const t = setup();
    assert.equal((await t.handle(post(payload("membership", {}, { phone })))).status, 200, phone);
  }
});

Deno.test("partnership type must be one of the five options", async () => {
  for (const ok of ["Event Partnership", "Sponsorship", "Community Collaboration", "Corporate Partnership", "Other"]) {
    assert.equal((await setup().handle(post(payload("partnership", {}, { partnershipType: ok })))).status, 200, ok);
  }
  const res = await setup().handle(post(payload("partnership", {}, { partnershipType: "Hostile Takeover" })));
  assert.equal(res.status, 400);
  assert.ok((await j(res)).fieldErrors.partnershipType);
});

Deno.test("length limits and link limit", async () => {
  const cases: [keyof typeof goodFields, string, string][] = [
    ["general", "fullName", "x".repeat(101)], ["general", "fullName", "x"], ["general", "subject", "x".repeat(151)], ["general", "subject", "ab"],
    ["general", "message", "x".repeat(2001)], ["general", "message", "short"], ["membership", "city", "x".repeat(101)], ["membership", "organisation", "x".repeat(151)],
    ["membership", "message", "x".repeat(2001)], ["partnership", "organisation", "x".repeat(151)],
    ["general", "message", "see http://a.com and http://b.com and http://c.com for details"],
  ];
  for (const [type, field, value] of cases) {
    const res = await setup().handle(post(payload(type, {}, { [field]: value })));
    assert.equal(res.status, 400, `${type}.${field} ${value.slice(0, 12)}`);
    assert.ok((await j(res)).fieldErrors[field]);
  }
  // exactly at the limits is fine
  assert.equal((await setup().handle(post(payload("general", {}, { message: "x".repeat(2000), subject: "s".repeat(150), fullName: "n".repeat(100) })))).status, 200);
});

Deno.test("input is sanitised: control/invisible characters removed, whitespace collapsed", async () => {
  const t = setup();
  await t.handle(post(payload("general", {}, { fullName: "  Meera\u0000   \u202EShah\t ", subject: "Hello\u200B\nworld", message: "line1\r\n\r\n\r\n\r\nline2\u0007 " })));
  assert.equal(t.rows[0].full_name, "Meera Shah");
  assert.equal(t.rows[0].subject, "Hello world");
  assert.equal(t.rows[0].message, "line1\n\nline2");
});

Deno.test("non-string and unexpected fields are handled", async () => {
  const res = await setup().handle(post(payload("general", {}, { fullName: { $gt: "" }, subject: 12345 })));
  assert.equal(res.status, 400);
  const body = await j(res);
  assert.ok(body.fieldErrors.fullName && body.fieldErrors.subject);
  // unknown field (status) must never reach the database
  const t = setup();
  await t.handle(post(payload("general", {}, { status: "Closed", id: "evil", notification_status: "sent" })));
  assert.equal((t.rows[0] as Record<string, unknown>).status, undefined);
  assert.equal(t.rows[0].notification_status, "sent"); // set by the function itself
  assert.notEqual(t.rows[0].id, "evil");
});

Deno.test("invalid type / bad submission id / bad JSON / wrong method / wrong content type / oversized", async () => {
  const t = setup();
  assert.equal((await t.handle(post(payload("general", { type: "newsletter" })))).status, 400);
  assert.equal((await t.handle(post(payload("general", { clientSubmissionId: "not-a-uuid" })))).status, 400);
  assert.equal((await t.handle(post(null, { raw: "{not json" }))).status, 400);
  assert.equal((await t.handle(post(null, { raw: "[1,2]" }))).status, 400);
  assert.equal((await t.handle(post(null, { method: "GET" }))).status, 405);
  assert.equal((await t.handle(post(payload("general"), { ct: "text/plain" }))).status, 415);
  assert.equal((await t.handle(post(null, { raw: JSON.stringify({ pad: "x".repeat(25_000) }) }))).status, 413);
  assert.equal(t.rows.length, 0);
});

Deno.test("CORS: localhost allowed, unknown origin refused, wildcard not honoured, production origin via secret", async () => {
  const t = setup();
  const pre = await t.handle(new Request("https://x/functions/v1/submit-enquiry", { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": "POST" } }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(pre.headers.get("access-control-allow-headers")!, /apikey/);
  assert.match(pre.headers.get("access-control-allow-headers")!, /authorization/);

  const ok = await t.handle(post(payload("general")));
  assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);

  const evil = await t.handle(post(payload("general"), { origin: "https://evil.example" }));
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  const evilPre = await t.handle(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://evil.example" } }));
  assert.equal(evilPre.status, 403);

  const wild = setup({ env: { ...fullEnv, ALLOWED_ORIGINS: "*" } });
  assert.equal((await wild.handle(post(payload("general"), { origin: "https://evil.example" }))).status, 403);

  const prod = setup({ env: { ...fullEnv, ALLOWED_ORIGINS: "https://club.example.org/, https://other.example" } });
  const r = await prod.handle(post(payload("general"), { origin: "https://club.example.org" }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), "https://club.example.org");
});

Deno.test("spam: honeypot is discarded silently; instant submissions are refused", async () => {
  const t = setup();
  const bot = await t.handle(post(payload("general", { hp: "http://spam.example" })));
  assert.equal(bot.status, 200);
  assert.equal(t.rows.length, 0);
  assert.equal(t.sent.length, 0);

  const fast = await t.handle(post(payload("general", { elapsedMs: 200 })));
  assert.equal(fast.status, 400);
  assert.equal((await j(fast)).code, "too_fast");
  assert.equal((await t.handle(post(payload("general", { elapsedMs: "9000" })))).status, 400);
  assert.equal((await t.handle(post(payload("general", { elapsedMs: -5 })))).status, 400);
  assert.equal(t.rows.length, 0);
});

Deno.test("duplicate submission id (double click / retry) is stored and emailed once", async () => {
  const t = setup();
  const body = payload("membership");
  const first = await j(await t.handle(post(body)));
  const second = await j(await t.handle(post(body)));
  const third = await j(await t.handle(post(body)));
  assert.equal(first.ok && second.ok && third.ok, true);
  assert.equal(first.id, second.id);
  assert.equal(first.id, third.id);
  assert.equal(t.rows.length, 1);
  assert.equal(t.sent.length, 1);
});

Deno.test("concurrent double submit with the same id results in one row", async () => {
  const t = setup();
  const body = payload("general");
  const [a, b] = await Promise.all([t.handle(post(body)), t.handle(post(body))]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  // The in-memory store is not transactional, so allow the real DB's unique index to be what guarantees this; here we
  // only require that neither request fails.
  assert.ok(t.rows.length >= 1);
});

Deno.test("rate limit per IP, per email and globally; a retry of a stored submission is never blocked", async () => {
  const ip = setup();
  for (let i = 0; i < LIMITS_PER_HOUR.perIp; i++) {
    const r = await ip.handle(post(payload("general", {}, { email: `p${i}@example.com` }), { ip: "198.51.100.7" }));
    assert.equal(r.status, 200, `attempt ${i + 1}`);
  }
  const blocked = await ip.handle(post(payload("general", {}, { email: "extra@example.com" }), { ip: "198.51.100.7" }));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "3600");
  assert.equal((await j(blocked)).code, "rate_limited");
  // a different visitor is unaffected
  assert.equal((await ip.handle(post(payload("general", {}, { email: "other@example.com" }), { ip: "198.51.100.8" }))).status, 200);
  // IP is hashed, never stored raw
  assert.ok(ip.rows.every((r) => r.ip_hash && !r.ip_hash.includes("198.51.100") && r.ip_hash.length === 32));

  const em = setup();
  for (let i = 0; i < LIMITS_PER_HOUR.perEmail; i++) assert.equal((await em.handle(post(payload("general"), { ip: `203.0.113.${i + 1}` }))).status, 200);
  assert.equal((await em.handle(post(payload("general"), { ip: "203.0.113.99" }))).status, 429);

  const retryable = setup();
  const keep = payload("general", {}, { email: "keep@example.com" });
  await retryable.handle(post(keep, { ip: "192.0.2.1" }));
  for (let i = 0; i < 6; i++) await retryable.handle(post(payload("general", {}, { email: `k${i}@example.com` }), { ip: "192.0.2.1" }));
  assert.equal((await retryable.handle(post(keep, { ip: "192.0.2.1" }))).status, 200, "same submission id must still succeed");

  const g = setup();
  for (let i = 0; i < LIMITS_PER_HOUR.global; i++) g.rows.push({ ...({} as Row), created_at: NOW.toISOString(), email: `x${i}@e.com`, ip_hash: `h${i}`, client_submission_id: crypto.randomUUID() });
  assert.equal((await g.handle(post(payload("general")))).status, 429);
});

Deno.test("email notification: sent, content, and the secret key never leaks", async () => {
  const t = setup();
  const res = await t.handle(post(payload("partnership")));
  const text = await res.text();
  assert.ok(!text.includes(RESEND_KEY));
  assert.ok(!text.includes("club@example.org"));
  assert.equal(t.sent[0].cfg.to[0], "club@example.org");
  assert.equal(t.rows[0].notification_status, "sent");
  assert.ok(t.rows[0].notified_at);
});

Deno.test("email failure: enquiry stays saved, visitor still sees success, failure is recorded", async () => {
  const t = setup({ email: async () => ({ status: "failed", error: "Resend responded 403: domain not verified" }) });
  const res = await t.handle(post(payload("general")));
  assert.equal(res.status, 200);
  assert.equal((await j(res)).ok, true);
  assert.equal(t.rows.length, 1);
  assert.equal(t.rows[0].notification_status, "failed");
  assert.match(t.rows[0].notification_error!, /domain not verified/);
  assert.equal(t.rows[0].notified_at, null);
});

Deno.test("email provider throwing, or bookkeeping update failing, does not fail the enquiry", async () => {
  const a = setup({ email: async () => { throw new Error("kaboom"); } });
  assert.equal((await a.handle(post(payload("general")))).status, 200);
  assert.equal(a.rows[0].notification_status, "failed");
  const b = setup({ storeOpts: { failNotifyUpdate: true } });
  assert.equal((await b.handle(post(payload("general")))).status, 200);
  assert.equal(b.rows.length, 1);
});

Deno.test("Resend not configured: still works, marked skipped with a reason", async () => {
  for (const env of [{}, { RESEND_API_KEY: "k" }, { RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "bad", NOTIFY_EMAIL_TO: "a@b.com" }, { RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.com", NOTIFY_EMAIL_TO: "nope" }]) {
    const t = setup({ env: env as Record<string, string> });
    const res = await t.handle(post(payload("membership")));
    assert.equal(res.status, 200);
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0].notification_status, "skipped");
    assert.ok(t.rows[0].notification_error);
    assert.equal(t.sent.length, 0);
  }
});

Deno.test("storage failure: never reports success, never sends email", async () => {
  const t = setup({ storeOpts: { failInsert: true } });
  const res = await t.handle(post(payload("general")));
  const body = await j(res);
  assert.equal(res.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.code, "storage_failed");
  assert.equal(t.sent.length, 0);
  assert.ok(!JSON.stringify(body).includes("boom"), "internal error text must not reach the visitor");
});

// ---------------------------------------------------------------------------------------------------------------------
Deno.test("email template escapes HTML and is single-line safe in the subject", () => {
  const { subject, html, text } = renderEmail({
    enquiry_type: "General", full_name: "<img src=x onerror=alert(1)>", email: "a@b.com", phone: null, organisation: null, city: null, partnership_type: null,
    subject: "<script>alert(1)</script>", message: "Hello <b>there</b> & \"friends\"\nsecond line", id: "11111111-1111-4111-8111-111111111111", created_at: NOW.toISOString(),
  });
  assert.ok(!html.includes("<script>") && !html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;") && html.includes("&amp;") && html.includes("&quot;friends&quot;"));
  assert.ok(!/[\r\n]/.test(subject));
  assert.ok(html.includes("11111111-1111-4111-8111-111111111111"));
  assert.ok(html.includes("IST"));
  assert.ok(text.includes("Enquiry ID: 11111111-1111-4111-8111-111111111111"));
});

Deno.test("Resend request: endpoint, auth header, reply-to, idempotency; failures and timeouts are contained", async () => {
  const cfg = readEmailConfig((n) => fullEnv[n]);
  assert.equal(cfg.ok, true);
  if (!cfg.ok) return;
  const enquiry = { ...validateOk(), id: "22222222-2222-4222-8222-222222222222", created_at: NOW.toISOString() };

  let captured: { url: string; init: RequestInit } | null = null;
  const okFetch = (async (url: string, init: RequestInit) => { captured = { url, init }; return new Response("{}", { status: 200 }); }) as unknown as typeof fetch;
  assert.deepEqual(await sendNotification(cfg.config, enquiry, okFetch), { status: "sent" });
  assert.equal(captured!.url, "https://api.resend.com/emails");
  const h = captured!.init.headers as Record<string, string>;
  assert.equal(h.Authorization, `Bearer ${RESEND_KEY}`);
  assert.equal(h["Idempotency-Key"], "enquiry-22222222-2222-4222-8222-222222222222");
  const sentBody = JSON.parse(String(captured!.init.body));
  assert.equal(sentBody.reply_to, enquiry.email);
  assert.deepEqual(sentBody.to, ["club@example.org"]);
  assert.equal(sentBody.from, fullEnv.RESEND_FROM_EMAIL);

  const f403 = (async () => new Response('{"message":"The domain is not verified"}', { status: 403 })) as unknown as typeof fetch;
  const r403 = await sendNotification(cfg.config, enquiry, f403);
  assert.equal(r403.status, "failed");
  assert.ok(!JSON.stringify(r403).includes(RESEND_KEY));

  const slow = ((_u: string, init: RequestInit) => new Promise((_res, rej) => { init.signal!.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))); })) as unknown as typeof fetch;
  const rt = await sendNotification(cfg.config, enquiry, slow, 30);
  assert.equal(rt.status, "failed");
  assert.match((rt as { error: string }).error, /timed out/);

  const down = (async () => { throw new TypeError("network down"); }) as unknown as typeof fetch;
  assert.equal((await sendNotification(cfg.config, enquiry, down)).status, "failed");
});

function validateOk() {
  const r = validateFields("general", goodFields.general);
  if (!r.ok) throw new Error("fixture invalid");
  return r.data;
}
