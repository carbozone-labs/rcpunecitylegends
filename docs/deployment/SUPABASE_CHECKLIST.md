# Supabase + Resend checklist (no secret values in this file)

Website: `https://rcpunecitylegends.org`. Everything below is done **by the club owner** in Supabase, Resend and GoDaddy.
Longer explanations and a Windows/PowerShell walkthrough: `SETUP_ENQUIRY_SYSTEM.md`.

## 1. Database table (`public.enquiries`)

- Migration: `supabase/migrations/20261108000000_create_enquiries.sql`.
- Apply it with the CLI (`supabase link --project-ref <PROJECT-REF>` then `supabase db push`) **or** paste the whole file into
  Supabase > **SQL Editor** > Run.
- **Row Level Security review: correct.** RLS is enabled, there is **no policy for `anon`**, and `revoke all ... from anon, authenticated`
  is applied as a second layer, so the public anon key cannot read, insert, change or delete enquiries.
  Only the Edge Function (service-role key, which stays inside Supabase) writes to the table. Optional signed-in admins can read
  enquiries and change `status` only (`enquiry_admins` + `is_enquiry_admin()`); nobody is an admin until you add them.
  Check after running: Table Editor > `enquiries` shows "RLS enabled".
- The constraints match the website/Edge Function rules (lengths, required fields per type, status values).

## 2. Deploy the Edge Function

```bash
supabase login
supabase link --project-ref <PROJECT-REF>
supabase functions deploy submit-enquiry
```

Re-run the deploy command whenever anything under `supabase/functions/submit-enquiry/` changes.
The website calls `https://<PROJECT-REF>.supabase.co/functions/v1/submit-enquiry` (the function name is fixed in `src/lib/enquiry.ts`).

## 3. Secrets to set yourself (Supabase dashboard > Edge Functions > Secrets, or `supabase secrets set`)

| Secret name | Value | Secret? |
| ----------- | ----- | ------- |
| `RESEND_API_KEY` | Resend > API Keys > Create (Sending access). Starts with `re_` | **YES, confidential** |
| `RESEND_FROM_EMAIL` | `RC Pune City Legends <noreply@rcpunecitylegends.org>` (a plain `noreply@rcpunecitylegends.org` also works) | no |
| `NOTIFY_EMAIL_TO` | `rcpunecitylegends@gmail.com` | no |
| `ALLOWED_ORIGINS` | `https://rcpunecitylegends.org,https://www.rcpunecitylegends.org` | no |
| `IP_HASH_SALT` | any long random text you invent (used to hash visitor IPs for rate limiting) | yes, keep private |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically. **Do not set them, and never copy the
service-role key into the website, a `.env` file, a zip or a chat.** Check with `supabase secrets list` (shows names only).
If Resend is not configured the enquiry is still saved, with `notification_status = skipped`.

## 4. CORS (allowed origins)

- **Reviewed:** `handler.ts` does **not** use a wildcard and has **no hardcoded production origin**. A `*` in `ALLOWED_ORIGINS` is deliberately ignored.
- It already **reads allowed origins from the `ALLOWED_ORIGINS` secret** (comma-separated, trailing slashes stripped), so no code change is needed. Set the secret as in the table above.
- Built-in always-allowed origins: `http://localhost:3000` and `http://127.0.0.1:3000` (for development). This is harmless for the public form, but if you want production-only,
  delete the `DEFAULT_ORIGINS` entries in `supabase/functions/submit-enquiry/handler.ts` and redeploy (the unit tests assume localhost, so update them too).
- Requests from any other origin get `403 origin_not_allowed`. Requests with no `Origin` header (curl, server tools) are allowed; they still pass every other check.

## 5. JWT verification

- `supabase/config.toml` sets `verify_jwt = false` for `submit-enquiry`, so the platform does **not** check a JWT. This is correct for a public form.
- The website still sends the anon key (`apikey` and `Authorization: Bearer`), which is harmless and works either way. With `verify_jwt = false` it also works with newer
  `sb_publishable_...` keys, which are not JWTs and would be rejected if JWT verification were on.
- Protection comes from the function itself: origin check, 20 KB size limit, server-side validation, honeypot, 1.5 s time trap, rate limits (5 per IP, 3 per email, 100 total per hour), retry-safe submission id.
- If you ever see `401 Invalid JWT`, the function was deployed without the config: redeploy with `supabase functions deploy submit-enquiry --no-verify-jwt`.

## 6. Resend: verify rcpunecitylegends.org (required before real email works)

Resend refuses to send from a domain it has not verified, so until this is done `noreply@rcpunecitylegends.org` will fail (the enquiry is still saved; `notification_status` becomes `failed`).

1. resend.com > **Domains** > **Add Domain** > `rcpunecitylegends.org` (pick a region close to India if offered).
2. Resend shows DNS records (typically an SPF `TXT`, a DKIM `TXT`/`CNAME`, and an `MX` for the bounce sub-domain). Copy them exactly as shown.
3. GoDaddy > **My Products > Domains > rcpunecitylegends.org > DNS (Manage DNS)** > **Add New Record** for each one. In GoDaddy the **Name/Host** field takes only the part before the domain
   (for example `resend._domainkey`, `send`), not the full name. Do not delete existing records; if an SPF record already exists, merge instead of adding a second one.
4. Back in Resend click **Verify DNS Records**. It can take minutes to a few hours. Wait for status **Verified**.
5. Create the API key (Sending access), then set `RESEND_API_KEY` in Supabase (section 3).
6. Send a test enquiry and confirm the email arrives at `rcpunecitylegends@gmail.com` (check Spam the first time). Replying to the email answers the visitor directly (Reply-To is set to their address).

## 7. Final check

- [ ] Table exists, RLS on  - [ ] Function deployed  - [ ] 5 secrets set  - [ ] Resend domain Verified
- [ ] `.env.production` holds the real Project URL and anon key, site rebuilt and re-uploaded
- [ ] Test enquiry from https://rcpunecitylegends.org/contact: row stored, email received, `notification_status = sent`. Delete the test row.
