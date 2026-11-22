# Local run -> GitHub -> Hostinger (Hinglish guide)

Flow: pehle computer par chalao, phir GitHub par push karo, phir GitHub Actions apne aap build karke Hostinger par upload kar dega.

---

## Part 1: Locally run karo

Zaroori: Node.js 20 LTS (https://nodejs.org) aur Git (https://git-scm.com).

```bash
cd rcpunecitylegend-main
npm install
npm run dev
```
Browser mein http://localhost:3000 kholo. Pages, events, team, images check karo.
(`npm run dev` mein form tab tak "unavailable" dikhayega jab tak `.env.local` mein Supabase keys na hon.)

Form bhi local par test karna ho to `.env.example` ko copy karke `.env.local` banao aur 3 values bharo
(`NEXT_PUBLIC_SITE_URL=http://localhost:3000` rakh sakte ho). Dev server restart karo.

Production jaisa test (optional):
```bash
npm run typecheck && npm run lint && npm run check:content
npm run build
npx serve out
```
`npx serve out` ek local static server chalata hai, taaki dekho ki exported site theek khulti hai.

## Part 2: GitHub par daalo

1. github.com par naya **repository** banao (naam jaise `rcpunecitylegends`). **Private** rakhna behtar hai. README/.gitignore add mat karo.
2. Project folder mein:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git push -u origin main
```
3. Check karo ki `.env.production` aur `.env.local` push **nahi** hue (ye `.gitignore` mein hain, to nahi jayenge). Keys GitHub Secrets mein jayengi, repo mein nahi.

## Part 3: Hostinger mein FTP account banao

1. hPanel > **Files > FTP Accounts**.
2. Naya FTP account banao (ya default wala dekho). Note karo: **FTP host/server**, **username**, **password**, aur account ki **directory**.
3. Check karne ke liye FileZilla se login karo aur dekho ki `index.html` jahan upload honi chahiye (jahan `public_html` dikhta hai) wo path kya hai:
   - Agar login ke baad seedha `public_html` ke andar ho: `FTP_SERVER_DIR` = `./`
   - Agar `public_html` folder dikhta hai: `FTP_SERVER_DIR` = `public_html/`
   - Agar `domains/<tumhara-domain>/public_html` jaisa path ho, wahi poora path daalo (end mein `/` ke saath).

## Part 4: GitHub Secrets daalo

GitHub repo > **Settings > Secrets and variables > Actions > New repository secret**. 6 secrets banao:

| Secret | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `FTP_SERVER` | Hostinger FTP host (hPanel mein dikhta hai) |
| `FTP_USERNAME` | FTP username |
| `FTP_PASSWORD` | FTP password |
| `FTP_SERVER_DIR` | Part 3 wala path, jaise `public_html/` |

Service-role key ya Resend key yahan bhi mat daalo.

## Part 5: Deploy

1. Pehle Hostinger par domain/nameservers/SSL ready karo (`HOSTINGER_DEPLOY.md` Step 4 aur 6), aur Supabase setup (`SUPABASE_CHECKLIST.md`).
2. `main` branch par kuch push karo, ya GitHub > **Actions > Build and deploy to Hostinger (FTP) > Run workflow**.
3. Actions tab mein green tick ka wait karo (5-10 min). Pehli baar upload bada hai (~50 MB), isme der lag sakti hai.
4. Fir `HOSTINGER_DEPLOY.md` ke Step 7 jaisa smoke test karo.

Aage ka kaam: code badlo, `git add . && git commit -m "..." && git push`. Site apne aap update ho jayegi.

## Problem aaye to

| Problem | Solution |
| --- | --- |
| Workflow "Placeholder Supabase values" se fail | `NEXT_PUBLIC_SUPABASE_*` secrets sahi naam se daale ya nahi, dekho. |
| FTP login fail / timeout | Host, username, password dobara copy karo. Agar `ftps` se connect na ho to `deploy-hostinger.yml` mein `protocol: ftps` ko `ftp` kar do. |
| Upload ho gaya par site nahi khuli | `FTP_SERVER_DIR` galat hai, files sub-folder mein gayi hain. Sahi path daalo aur dobara run karo. |
| Purani `_next` files bachi hain | Zarurat ho to hPanel File Manager se `_next` folder delete karke workflow dobara chalao. |
| 500 error | `HOSTINGER_DEPLOY.md` ka troubleshooting table dekho (`.htaccess.off`). |

## Shortcut: keys ek saath daalne ka script
Supabase, Resend aur GitHub secrets ek hi baar mein set karne ke liye (Windows PowerShell, project folder mein):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-keys.ps1
```
Ye `.env.production` / `.env.local` likhta hai, Supabase secrets set karke Edge Function deploy karta hai, aur (agar `gh` installed ho) GitHub secrets bhi daal deta hai.
Resend domain ka DNS verify aapko haath se karna padega.
