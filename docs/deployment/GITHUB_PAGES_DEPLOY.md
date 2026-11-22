# GitHub Pages deployment

The repository deploys the static export to `https://carbozone-labs.github.io/rcpunecitylegends/` when a commit is pushed to `main`.

## GitHub setup

1. In the repository's **Settings > Secrets and variables > Actions**, create:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. In **Settings > Pages**, set the source to **GitHub Actions**.
3. Check the **Actions** tab for the `Deploy GitHub Pages` workflow.

Only the public Supabase URL and anon/publishable key are needed at build time. Never add a service-role key, Resend key, or roster/password file to the repository or Actions settings.

## Supabase setup for the Pages URL

In Supabase:

- Add `https://carbozone-labs.github.io` to `ALLOWED_ORIGINS`, preserving any existing allowed origins. This is the website origin; do not include the repository path.
- In **Authentication > URL Configuration**, set the Site URL to `https://carbozone-labs.github.io/rcpunecitylegends` and allow redirects under `https://carbozone-labs.github.io/rcpunecitylegends/**`.
- Set the Edge Function secret `INVITE_REDIRECT_URL` to `https://carbozone-labs.github.io/rcpunecitylegends/members/login/`.

After changing Supabase settings, test a public enquiry, password recovery, and a member invitation. Enquiry emails will only send after the configured Resend sender domain is verified.
