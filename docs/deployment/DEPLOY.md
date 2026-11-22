> **Hostinger par host kar rahe ho? `HOSTINGER_DEPLOY.md` padho.** Ye file GoDaddy cPanel ke liye likhi gayi thi; build aur smoke-test ke steps dono mein same hain.

# Deploying to GoDaddy (cPanel, static hosting): https://rcpunecitylegends.org

The website is a **static export**: `npm run build` writes plain HTML, CSS, JS and images into the `out/` folder, and that
folder is all GoDaddy needs. There is no Node server on the host. The enquiry form talks directly to Supabase
(see `SUPABASE_CHECKLIST.md`). Canonical address: `https://rcpunecitylegends.org` (no `www`; `www` and `http` redirect to it).

## 1. Build the site (on your computer)

1. Open `.env.production` and make sure all three values are real (they are all PUBLIC values):

   | Variable | Value |
   | -------- | ----- |
   | `NEXT_PUBLIC_SITE_URL` | `https://rcpunecitylegends.org` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` / publishable key |

   The two Supabase values are baked into the JavaScript at build time. **If you change them you must rebuild and upload again.**
   Never put the service-role key or the Resend key here.
2. Run:

   ```bash
   npm install
   npm run typecheck && npm run lint && npm run check:content
   npm run build
   ```
3. The finished website is in `out/`. It already contains `.htaccess` (copied from `public/.htaccess`).

## 2. Upload to cPanel

1. GoDaddy > **My Products > Web Hosting > Manage > cPanel Admin**.
2. **File Manager** > open `public_html`. In cPanel **Settings** (top right) tick **Show Hidden Files (dotfiles)**, otherwise you will not see `.htaccess`.
3. Remove the default GoDaddy placeholder files (for example `index.html`/`default.html` coming-soon page).
4. **Upload** `godaddy-public_html.zip` into `public_html`, right-click it > **Extract**, then delete the zip.
   (Or upload the contents of `out/` yourself, including `.htaccess`.) Make sure `index.html`, `404.html`, `.htaccess` and the `_next` folder sit **directly** in `public_html`, not inside a sub-folder.
5. When updating the site later: upload the new files over the old ones. Delete `_next/` first so old hashed files do not pile up.

## 3. Domain, SSL and redirects

1. Point the domain to the hosting (if the domain is registered at GoDaddy and the hosting is in the same account this is automatic). `rcpunecitylegends.org` must be the hosting's **primary domain** (or an addon domain whose document root is `public_html`).
2. Make sure a `www` record exists (cPanel > **Domains** shows `www.rcpunecitylegends.org` automatically for a primary domain) so the `www` > non-`www` redirect has something to answer.
3. **SSL:** cPanel > **SSL/TLS Status** > select the domain and `www` > **Run AutoSSL** (free). If GoDaddy sells you an SSL plan instead, install that. Wait until the padlock works on `https://rcpunecitylegends.org` **before** relying on the redirect rules.
4. `.htaccess` then does the rest: `http` > `https`, `www` > non-`www` (one 301 hop), `/index.html` > `/`, clean URLs (`/events`, `/team/<slug>` with no `.html`), and the custom `404.html`. It leaves `/.well-known/` alone so SSL renewals keep working.

## 4. Smoke test after upload

- `http://www.rcpunecitylegends.org` ends on `https://rcpunecitylegends.org/`.
- `/events`, `/team`, `/contact` open (Apache adds the trailing slash); `/team/some-person-that-does-not-exist` shows the LEGENDS 404 page with a 404 status.
- `/sitemap.xml` and `/robots.txt` show `https://rcpunecitylegends.org` addresses.
- Images, fonts and the logo load; the Instagram link in the footer opens the club account.
- Send a **test enquiry** from `/contact` and check: the row appears in Supabase (Table Editor > `enquiries`), the email reaches `rcpunecitylegends@gmail.com`, and `notification_status` is `sent`. Delete the test row afterwards.
- Then submit `https://rcpunecitylegends.org/sitemap.xml` to Google Search Console.

## 5. Backend (one-time, not on GoDaddy)

The database table, the Edge Function, its secrets and the Resend domain verification are explained step by step in
**`SUPABASE_CHECKLIST.md`**. The enquiry form will not work until that is done and `.env.production` holds the real Supabase values.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| 500 error on every page | A rule in `.htaccess` is not allowed on the host. Rename it to `.htaccess.off`, confirm the site loads, then tell the developer which module is missing (usually `mod_headers`/`mod_expires`; the file wraps these in `<IfModule>`, so a 500 is unusual). |
| Redirect loop | SSL is not active yet, or the host sits behind a proxy that hides HTTPS. Run AutoSSL first. |
| Pages work but styling/images are missing | `_next/` or `images/` was not uploaded, or was uploaded into a sub-folder. |
| Old content still shows | Hard refresh (Ctrl+F5); `.html` is served with `no-cache`, images are cached 30 days. |
| Form says "temporarily unavailable" | The build was made without real `NEXT_PUBLIC_SUPABASE_*` values. Fix `.env.production`, rebuild, re-upload. |
| Form says "This website is not allowed to send enquiries" | `ALLOWED_ORIGINS` in Supabase does not contain `https://rcpunecitylegends.org`. |
