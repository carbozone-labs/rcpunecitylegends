# Enquiry system setup (Supabase + Resend)

All commands are for **Windows 11 + PowerShell** (the VS Code integrated terminal). Run them from the project root
(the folder that contains `package.json`) unless stated otherwise.

This is the detailed guide (Windows/PowerShell). `SUPABASE_CHECKLIST.md` is the short production checklist for https://rcpunecitylegends.org; website deployment to GoDaddy is in `DEPLOY.md`.
Nothing here pushes, commits or deploys the website.

## How it works

```
Visitor's browser (static site: https://rcpunecitylegends.org on GoDaddy; localhost:3000 in development)
   |  POST https://<project-ref>.supabase.co/functions/v1/submit-enquiry
   v
Supabase Edge Function  submit-enquiry     <- validates, blocks spam, rate-limits
   |-- inserts the enquiry into  public.enquiries   (service-role key, inside Supabase only)
   '-- emails the club through Resend               (Resend key, inside Supabase only)
```

The site stays a static export (no Next.js API routes, no middleware). The browser only ever knows two **public** values.

### Public vs confidential

| Value | Where it lives | Public? |
| ----- | -------------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` (development) and `.env.production` (the GoDaddy build) | **Public.** Baked into the website. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` (development) and `.env.production` (the GoDaddy build) | **Public.** Designed to be visible; Row Level Security is what protects the data. |
| Supabase **service-role / secret key** | Supabase only (injected into the Edge Function automatically) | **CONFIDENTIAL.** Never in the website, never in git, never in chat. |
| `RESEND_API_KEY` | Supabase Edge Function secret | **CONFIDENTIAL** |
| `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL_TO` | Supabase Edge Function secrets | Not secret, but kept out of the website |
| `ALLOWED_ORIGINS`, `IP_HASH_SALT` | Supabase Edge Function secrets | Keep private (the salt especially) |

## 0. Check your tools

```powershell
node --version
npm --version
git --version
```

Missing something? Install **Node.js LTS** from https://nodejs.org (includes npm) and **Git for Windows** from
https://git-scm.com/download/win, then **close and reopen VS Code** so the new PATH is picked up. The project needs Node 18.18 or newer.

## 1. Run the website locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000. (`npm install` only installs what is already in `package.json`; no new packages were added.)

## 2. Create the Supabase account and project

1. Go to https://supabase.com, choose **Start your project** and sign up (GitHub or email).
2. **New project**: pick an organisation, a name (for example `rc-pune-city-legends`), a strong database password
   (store it in a password manager; you will rarely need it) and the region closest to your visitors (for Pune, a South Asia region such as Mumbai if offered).
3. Wait for the project to finish provisioning.
4. Note your **project reference**: the part before `.supabase.co` in the Project URL, or *Project Settings > General > Reference ID*.
5. Open *Project Settings > API* (or *API Keys*). You need the **Project URL** and the **anon / publishable** key. Do **not** copy the service-role / secret key anywhere.

## 3. Install the Supabase CLI (Windows)

**Option A: Scoop (recommended, installs a real `supabase` command)**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser   # only if Scoop is not installed yet
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression          # only if Scoop is not installed yet
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

**Option B: no install, run it on demand through npm.** Use `npx supabase@latest <command>` wherever this guide says `supabase <command>`.
(Do not use `npm install -g supabase`; the CLI does not support global npm installs.)

You do **not** need Docker for anything in this guide.

## 4. Link the project and create the database

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`supabase db push` applies `supabase/migrations/20261108000000_create_enquiries.sql`, which creates:

- `public.enquiries` with all required fields, status default `New`, constraints and indexes.
- **Row Level Security enabled** with **no access for visitors**: the public anon key can neither read, change nor delete enquiries.
- `public.enquiry_admins` + `public.is_enquiry_admin()` so you can optionally let signed-in administrators read enquiries and change their status (nothing else).

Check in the dashboard: *Table Editor > enquiries*, and *Authentication > Policies* should show RLS enabled.

*Alternative without the CLI:* open *SQL Editor*, paste the contents of the migration file, and press **Run**.

### Seeing and managing enquiries

Open *Table Editor > enquiries* in the Supabase dashboard (dashboard users are your administrators). Change the `status`
column through New / In Review / Contacted / Closed. Columns `notification_status` and `notification_error` show whether the email went out.

*Optional: let a signed-in user be an admin through the API.* Create the user under *Authentication > Users*, then in the SQL Editor:

```sql
insert into public.enquiry_admins (user_id)
select id from auth.users where email = 'admin@example.org';
```

## 5. Set up Resend (email notifications)

1. Create an account at https://resend.com.
2. **Domains > Add Domain** and enter `rcpunecitylegends.org`.
   Resend shows DNS records (SPF / DKIM). Add them in GoDaddy DNS and click **Verify** (can take minutes to hours). Step-by-step: `SUPABASE_CHECKLIST.md`, section 6.
   Only a verified domain can send to the club's inbox from your own address.
3. **API Keys > Create API Key**, permission **Sending access**. Copy it once; it starts with `re_`. It is **confidential**.
4. Decide the sender: a name and an address on the verified domain, for the club: `RC Pune City Legends <noreply@rcpunecitylegends.org>`.
5. Decide where notifications go: the club's inbox (`NOTIFY_EMAIL_TO`). Several addresses can be comma-separated.

Until a domain is verified, Resend's built-in test sender (`onboarding@resend.dev`) can normally only deliver to the address that owns the Resend account (check Resend's current docs). That is fine for a first test.

> The notification address (`rcpunecitylegends@gmail.com`) and sender (`noreply@rcpunecitylegends.org`) are not written in the code. You set them as secrets below.

## 6. Set the Edge Function secrets (confidential values go here, not in the website)

Single quotes keep PowerShell from interpreting special characters.

```powershell
supabase secrets set RESEND_API_KEY='re_xxxxxxxxxxxxxxxxxxxx'
supabase secrets set RESEND_FROM_EMAIL='RC Pune City Legends <noreply@rcpunecitylegends.org>'
supabase secrets set NOTIFY_EMAIL_TO='rcpunecitylegends@gmail.com'
supabase secrets set IP_HASH_SALT='any-long-random-text-you-invent'
supabase secrets set ALLOWED_ORIGINS='https://rcpunecitylegends.org,https://www.rcpunecitylegends.org'
supabase secrets list
```

- `ALLOWED_ORIGINS` lists the **production** website origin (scheme + host, no path, no trailing slash); several are comma-separated.
  `http://localhost:3000` and `http://127.0.0.1:3000` are always allowed for local testing. A `*` wildcard is intentionally ignored.
- `SUPABASE_URL` and the service-role key are supplied to the function by Supabase automatically; do not set them.
- If Resend is not configured, enquiries are **still saved**; they are marked `notification_status = skipped`.

## 7. Deploy the Edge Function

```powershell
supabase functions deploy submit-enquiry
```

`supabase/config.toml` sets `verify_jwt = false` for this function because the form is public (visitors have no account). The function protects itself:
allowed-origin check, size limit, server-side validation, honeypot and timing checks, rate limits (5 per IP, 3 per email, 100 in total per hour),
and a retry-safe submission id. Re-run the deploy command whenever you change anything under `supabase/functions/submit-enquiry`.

## 8. Connect the website

Create `.env.local` in the project root. In VS Code: *File > New File*, save it as `.env.local` in the root folder next to `package.json`; or:

```powershell
Copy-Item .env.example .env.local
code .env.local
```

Fill in the two **public** values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

For the live site put the same two values (plus `NEXT_PUBLIC_SITE_URL=https://rcpunecitylegends.org`) in `.env.production` before `npm run build`.

Stop and restart the dev server after any change to `.env.local` (`Ctrl+C`, then `npm run dev`); Next.js reads it only at start-up.
`.env.local` is in `.gitignore`.

## 9. Test locally

Open http://localhost:3000 and try each path:

| Page | Enquiry type |
| ---- | ------------ |
| http://localhost:3000/join (default tab) | Membership |
| http://localhost:3000/join?type=partnership#enquiry | Partnership |
| http://localhost:3000/contact#message | General |

Check: required-field messages, invalid email, invalid phone, the button disabling and showing "Sending…", and the success message
after a good submission. Then confirm the row appears in *Table Editor > enquiries* and the email arrives in the club inbox.

Quick backend check without the browser (should print `ok : True`; `elapsedMs` must be over 1500 or the spam check rejects it):

```powershell
$body = @{
  type = 'general'
  clientSubmissionId = [guid]::NewGuid().ToString()
  elapsedMs = 8000
  hp = ''
  fields = @{ fullName = 'Test Person'; email = 'test@example.com'; subject = 'Local test'; message = 'Testing the enquiry system.' }
} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/submit-enquiry' `
  -ContentType 'application/json' -Headers @{ Origin = 'http://localhost:3000' } -Body $body
```

Delete test rows afterwards in the Table Editor.

Automated checks:

```powershell
npm run typecheck
npm run check:content
npm run build
```

(Optional, only if you have Deno installed: `deno test --allow-all supabase/functions/submit-enquiry`. This runs 22 tests of the function's logic with no network.)

## 10. Production

The website is deployed by hand to GoDaddy cPanel (`DEPLOY.md`); there is no GitHub Pages deployment and no deploy workflow. The two public values must be in
`.env.production` when you run `npm run build` (they are baked into the JavaScript), and `ALLOWED_ORIGINS` must contain `https://rcpunecitylegends.org` (step 6).

## Troubleshooting

| Symptom | Likely cause and fix |
| ------- | -------------------- |
| "Enquiries are temporarily unavailable on this website" | `.env.local` missing/misnamed, values empty, or the dev server was not restarted. |
| Browser console shows a CORS error | The page's origin is not allowed. Use exactly `http://localhost:3000`, or add the origin to `ALLOWED_ORIGINS` and run `supabase secrets list` to confirm. |
| 401 "Invalid JWT" | The function was deployed with JWT verification on. Redeploy with `supabase functions deploy submit-enquiry` (the config sets `verify_jwt = false`), or add `--no-verify-jwt`. |
| "That was very quick" | Submitted in under 1.5 seconds (spam check). Wait a moment and submit again. |
| 429 "several enquiries recently" | Rate limit (5/IP/hour, 3/email/hour). Wait, or clear test rows in the Table Editor. |
| Enquiry saved but no email | See the `notification_status` / `notification_error` columns. Typical causes: domain not verified in Resend, wrong `RESEND_FROM_EMAIL`, wrong key. Fix the secret, then follow up manually; failed rows are not re-sent automatically. |
| `supabase` is not recognised | Reopen the terminal after installing, or use `npx supabase@latest ...`. |
| `supabase db push` asks for the database password | Use the password from step 2 (reset it in *Project Settings > Database* if lost). |
| Function errors | Dashboard: *Edge Functions > submit-enquiry > Logs*. |
| `scoop` blocked by execution policy | Run the `Set-ExecutionPolicy ... CurrentUser` line in step 3. |

Failed or skipped notifications, newest first (SQL Editor):

```sql
select created_at, enquiry_type, full_name, email, notification_status, notification_error
from public.enquiries
where notification_status in ('failed', 'skipped', 'pending')
order by created_at desc;
```

## Re-enabling the Legend Zone later

The Legend Zone prototype is switched off, not deleted. To turn it back on:

1. In `src/config/features.ts` set `legendZoneEnabled: true`.
2. Restart `npm run dev` (or run `npm run build`).

That restores the "Legend Zone" navigation link and builds the `/legend-zone/*` routes again (route files are the `*.zone.tsx` files in `src/app/legend-zone`;
`next.config.mjs` only treats them as pages while the flag is `true`). When the new version is ready, rename those files back to `page.tsx`, `layout.tsx`
and `not-found.tsx`, and delete the `pageExtensions` switch in `next.config.mjs`. Details: `src/app/legend-zone/README.md`.

## Keeping the two validation copies in sync

`src/lib/enquiry.ts` (browser, friendly messages) and `supabase/functions/submit-enquiry/validation.ts` (server, trusted) hold the same limits and patterns.
If you change a limit, change both, update the database constraints in a new migration, and redeploy the function.
