# Hostinger par deploy karne ki guide (Hinglish)

Ye site ek **static export** hai: `npm run build` se `out/` folder banta hai, aur sirf wahi Hostinger ke `public_html` mein jata hai.
Node server ki zarurat nahi. Plan: Hostinger Web/Premium/Business shared hosting kaafi hai (LiteSpeed server, `.htaccess` chalta hai).

> Is project mein `public/.htaccess` Hostinger (LiteSpeed) ke liye already fix kiya gaya hai (`<If>` block hata diya gaya hai).
> Domain `rcpunecitylegends.org` ke liye set hai. Agar koi aur domain lo to neeche "Alag domain" section dekho.

---

## Step 0: Computer par jo chahiye
- Node.js 18.18 ya naya (https://nodejs.org, LTS version)
- Ye project folder

## Step 1: Supabase + Resend (form ke liye, ek baar)
Detail: `SUPABASE_CHECKLIST.md`. Short mein:
1. supabase.com par project banao. SQL Editor mein `supabase/migrations/20261108000000_create_enquiries.sql` paste karke Run karo.
2. Edge Function deploy karo: `supabase login`, `supabase link --project-ref <PROJECT-REF>`, `supabase functions deploy submit-enquiry`.
3. Supabase > Edge Functions > Secrets mein ye 5 daalo: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL_TO`, `ALLOWED_ORIGINS`
   (= `https://rcpunecitylegends.org,https://www.rcpunecitylegends.org`), `IP_HASH_SALT`.
4. Resend mein domain verify karo. **Dhyan:** Resend jo DNS records de (SPF/DKIM/MX), unhe wahin add karo jahan tumhare domain ke
   **nameservers** point karte hain. Agar nameservers Hostinger par hain to Hostinger hPanel > Domains > DNS / Nameservers > DNS Zone Editor mein,
   BigRock mein nahi.

## Step 2: Asli keys daalo
`.env.production` kholo aur ye 3 values sahi karo (teeno PUBLIC values hain):
```
NEXT_PUBLIC_SITE_URL=https://rcpunecitylegends.org
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
Supabase > Project Settings > API se milti hain. **Service-role key ya Resend key yahan kabhi mat daalo.**

## Step 3: Build
```bash
npm install
npm run typecheck && npm run lint && npm run check:content
npm run build
```
Ab `out/` folder ready hai (isme `.htaccess`, `index.html`, `404.html`, `_next/` sab hona chahiye).

## Step 4: Hostinger mein website/hosting setup
1. hPanel mein login karo. **Websites > Add website** (menu ke naam thode alag ho sakte hain) aur apna domain chuno.
   Agar domain BigRock se liya hai, to "existing domain" / "already have a domain" wala option chuno.
2. Hostinger jo **nameservers** dikhaye (aksar `ns1.dns-parking.com` aur `ns2.dns-parking.com`, par hPanel mein jo likha ho wahi use karo) unhe note karo.
3. **BigRock** mein login karo > Domain Management > **Name Servers** > Custom nameservers mein wo 2 nameservers daalo > Save.
   Propagation mein kuch minute se 24 ghante tak lag sakte hain.

## Step 5: Files upload
1. hPanel > **Files > File Manager > public_html**.
2. Default file (jaise `default.php`) delete karo.
3. File Manager ki settings mein **hidden files / dotfiles dikhana** on karo (warna `.htaccess` nahi dikhega).
4. `out/` folder ke **andar ka content** upload karo (folder khud nahi). Aasaan tareeka: `out/` ke andar ki sab files ka ZIP banao,
   `public_html` mein upload karo, right-click > Extract, phir zip delete karo.
5. Check karo ki `index.html`, `404.html`, `.htaccess`, `_next/` seedha `public_html` mein hain, kisi sub-folder mein nahi.

## Step 6: SSL (https)
hPanel > **Security > SSL** mein domain ke liye free SSL install/activate karo, phir **Force HTTPS** on karo.
SSL chalne ke baad hi `.htaccess` ke redirects test karo (warna redirect loop aa sakta hai).

## Step 7: Test
- `http://www.rcpunecitylegends.org` aakhir mein `https://rcpunecitylegends.org/` par pahunche.
- `/events`, `/team`, `/contact`, `/join` khulein. Koi galat URL par LEGENDS 404 page dikhe.
- `/sitemap.xml` aur `/robots.txt` mein `https://rcpunecitylegends.org` ho.
- `/contact` se ek **test enquiry** bhejo: Supabase > Table Editor > `enquiries` mein row aaye, `rcpunecitylegends@gmail.com` par email aaye
  (pehli baar Spam dekho). Test row delete kar do.
- Phir `https://rcpunecitylegends.org/sitemap.xml` Google Search Console mein submit karo.

## Baad mein update karna
Content badlo, `npm run build` chalao, `public_html` se purana `_next/` folder delete karo, naya `out/` content upload karo.
Detail: `HOW_TO_UPDATE.md`.

## Alag domain lena ho to (jaise racpunecitylegends.in)
`rcpunecitylegends.org` in 4 jagah hai, sabko naye domain se badlo, phir rebuild:
1. `.env.production` mein `NEXT_PUBLIC_SITE_URL`
2. `public/.htaccess` mein 2 redirect lines (`https://rcpunecitylegends.org%{REQUEST_URI}`)
3. Supabase secrets: `ALLOWED_ORIGINS` aur `RESEND_FROM_EMAIL`
4. Resend mein naya domain verify karo

## Problem aaye to
| Problem | Solution |
| --- | --- |
| 500 error | `.htaccess` ka naam `.htaccess.off` karo. Site khule to rule mein dikkat hai, wapas naam badal ke dekho. |
| Redirect loop | SSL active nahi hai ya Force HTTPS pehle on kar diya. Pehle SSL chalao. |
| Styling/images nahi aa rahe | `_next/` ya `images/` upload nahi hua ya sub-folder mein chala gaya. |
| Form "temporarily unavailable" | Build asli Supabase keys ke bina bana. `.env.production` theek karo, rebuild, dobara upload. |
| Form "not allowed to send enquiries" | Supabase `ALLOWED_ORIGINS` mein tumhara domain nahi hai. |
| Purana content dikh raha hai | Ctrl+F5 (hard refresh). |
