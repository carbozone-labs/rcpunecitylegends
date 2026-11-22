// Supabase Edge Function: submit-enquiry
// Receives website enquiries, validates them, stores them in public.enquiries and emails the club through Resend.
// Deployed with: supabase functions deploy submit-enquiry   (verify_jwt is false in supabase/config.toml: this is a public form)
//
// Secrets (Supabase > Edge Functions > Secrets, or `supabase secrets set`). None of them is ever sent to the browser:
//   RESEND_API_KEY      Resend API key
//   RESEND_FROM_EMAIL   verified sender, e.g. "RC Pune City Legends <enquiries@your-verified-domain>"
//   NOTIFY_EMAIL_TO     club inbox that receives notifications (comma-separated for several)
//   ALLOWED_ORIGINS     production website origin(s), comma-separated, e.g. https://example.org  (localhost:3000 is always allowed)
//   IP_HASH_SALT        optional random string used to hash IPs for rate limiting
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createHandler, type EnquiryStore } from "./handler.ts";
import { sendNotification } from "./email.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const firstSecretKey = (): string | undefined => {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.find((value): value is string => typeof value === "string");
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed).find((value): value is string => typeof value === "string");
    }
  } catch {
    return undefined;
  }
  return undefined;
};
const serviceKey =
  firstSecretKey() ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY");
if (!supabaseUrl || !serviceKey) console.error("[submit-enquiry] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing");

// Service-role client: bypasses Row Level Security. Lives only inside this function.
const supabase = createClient(supabaseUrl ?? "", serviceKey ?? "", { auth: { persistSession: false, autoRefreshToken: false } });

const store: EnquiryStore = {
  async findBySubmissionId(id) {
    const { data, error } = await supabase.from("enquiries").select("id").eq("client_submission_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  async countSince(filter, sinceIso) {
    let q = supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", sinceIso);
    if (filter.ipHash) q = q.eq("ip_hash", filter.ipHash);
    if (filter.email) q = q.eq("email", filter.email); // stored lower-case
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
  async insert(row) {
    const { data, error } = await supabase.from("enquiries").insert(row).select("id, created_at").single();
    if (!error && data) return { kind: "created", id: data.id, created_at: data.created_at };
    if (error?.code === "23505") {
      // Same client_submission_id arrived twice at once: the first one won, report that one.
      const existing = await store.findBySubmissionId(row.client_submission_id);
      if (existing) return { kind: "duplicate", id: existing.id };
    }
    return { kind: "error", message: `${error?.code ?? ""} ${error?.message ?? "unknown error"}`.trim() };
  },
  async updateNotification(id, patch) {
    const { error } = await supabase.from("enquiries").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  },
};

Deno.serve(
  createHandler({
    getEnv: (name) => Deno.env.get(name),
    store,
    sendEmail: (cfg, enquiry) => sendNotification(cfg, enquiry),
  }),
);
