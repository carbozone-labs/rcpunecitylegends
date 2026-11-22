# Before Project Structure

Snapshot of the supplied ZIP before implementation. Generated directories/dependencies are not present in this archive.

```text
rcpunecitylegend-main/
├── .env.example
├── .eslintrc.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-hostinger.yml
├── .gitignore
├── DEPLOY.md
├── GITHUB_DEPLOY.md
├── HOSTINGER_DEPLOY.md
├── HOW_TO_UPDATE.md
├── MEMBERS_HUB_ADMIN_GUIDE.md
├── MEMBERS_HUB_ARCHITECTURE.md
├── MEMBERS_HUB_ATTENDANCE.md
├── MEMBERS_HUB_DATABASE_REFERENCE.md
├── MEMBERS_HUB_DEPLOYMENT_GUIDE.md
├── MEMBERS_HUB_EVENTS.md
├── MEMBERS_HUB_FINAL_ARCHITECTURE.md
├── MEMBERS_HUB_FINAL_REPORT.md
├── MEMBERS_HUB_MEMBER_GUIDE.md
├── MEMBERS_HUB_OPERATIONS_SECURITY.md
├── MEMBERS_HUB_PHASE1_REPORT.md
├── MEMBERS_HUB_PHASE2_REPORT.md
├── MEMBERS_HUB_SECURITY.md
├── MEMBERS_HUB_SECURITY_AUDIT.md
├── MEMBERS_HUB_SETUP.md
├── MEMBERS_HUB_TASKS.md
├── MEMBERS_PORTAL_GUIDE.md
├── OFFICE_BEARER_ADMIN_GUIDE.md
├── README.md
├── SETUP_ENQUIRY_SYSTEM.md
├── SUPABASE_CHECKLIST.md
├── THREE_PORTAL_ARCHITECTURE.md
├── THREE_PORTAL_IMPLEMENTATION_REPORT.md
├── archive/
│   ├── event-photos-manifest.csv
│   ├── event-photos-manifest.json
│   └── event-photos-original/
│       ├── anokhi-wari-3-o/
│       │   └── Anokhi Wari 3.O.jpg
│       ├── club-assembly/
│       │   ├── IMG-20260823-WA0185.jpg
│       │   ├── IMG-20260823-WA0204.jpg
│       │   ├── IMG-20260823-WA0221.jpg
│       │   ├── IMG-20260823-WA0239.jpg
│       │   ├── IMG-20260823-WA0251.jpg
│       │   ├── IMG-20260823-WA0253.jpg
│       │   └── IMG-20260823-WA0290.jpg
│       ├── club-installation/
│       │   ├── IMG-20261011-WA0372.jpg
│       │   ├── IMG-20261011-WA0378.jpg
│       │   ├── IMG-20261011-WA0390.jpg
│       │   ├── IMG-20261011-WA0400.jpg
│       │   ├── IMG-20261011-WA0440.jpg
│       │   ├── IMG-20261011-WA0496.jpg
│       │   ├── IMG-20261011-WA0573.jpg
│       │   ├── IMG-20261011-WA0619.jpg
│       │   ├── IMG-20261012-WA0343.jpg
│       │   └── IMG-20261012-WA0357.jpg
│       ├── dandiya/
│       │   ├── Dandiya.HEIC
│       │   └── Dandiya.jpg
│       ├── dhanya-sangrahan-2-o/
│       │   ├── Dhanya Sangrahan 2.O(1).jpg
│       │   └── Dhanya Sangrahan 2.O.jpg
│       ├── diwali-celebration/
│       │   ├── Diwali Celebration(1).jpg
│       │   ├── Diwali Celebration.jpg
│       │   └── Diwali Celebtation.jpg
│       ├── gajsanskruti-10-o/
│       │   ├── Gajsanskruti 10.O 1.jpeg
│       │   └── Gajsanskruti 10.O.jpg
│       ├── mahadaan-12-o/
│       │   └── Mahadaan 12.O.jpeg
│       ├── moasic-art/
│       │   ├── Moasic Art(1).jpg
│       │   └── Moasic Art.jpg
│       ├── morning-momenta/
│       │   ├── Morning Momenta(1).jpg
│       │   └── Morning Momenta.jpg
│       ├── samayati-4-o/
│       │   ├── IMG-20260921-WA0124.jpg
│       │   ├── IMG-20260921-WA0162.jpg
│       │   ├── IMG-20260921-WA0492.jpg
│       │   ├── IMG-20260921-WA0589.jpg
│       │   ├── IMG-20260921-WA0594.jpg
│       │   └── Samayati.jpeg
│       ├── smash-rally-vibe/
│       │   ├── IMG-20260913-WA0072.jpg
│       │   ├── IMG-20260913-WA0077.jpg
│       │   ├── IMG-20260913-WA0116.jpg
│       │   ├── IMG-20260913-WA0118.jpg
│       │   └── IMG-20260913-WA0141.jpg
│       └── sugandh-1-o/
│           ├── IMG-20260927-WA0105.jpg
│           ├── IMG-20260927-WA0113.jpg
│           ├── IMG-20260927-WA0127.jpg
│           └── IMG-20260927-WA0131.jpg
├── docs/
│   ├── README.md
│   ├── architecture/
│   │   └── PORTAL_BOUNDARIES.md
│   ├── deployment/
│   │   └── PRODUCTION_CHECKLIST.md
│   ├── reports/
│   │   └── INITIAL_CODEBASE_AUDIT.md
│   ├── security/
│   │   ├── AUTHORIZATION_MODEL.md
│   │   └── SECURITY_AUDIT_REPORT.md
│   └── testing/
│       ├── BUILD_AND_TEST_REPORT.md
│       └── VALIDATION_STATUS.md
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public/
│   ├── .htaccess
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── images/
│       ├── events/
│       │   ├── anokhi-wari-3-o/
│       │   │   ├── anokhi-wari-3-o-01-thumb.webp
│       │   │   └── anokhi-wari-3-o-01.webp
│       │   ├── club-assembly/
│       │   │   ├── club-assembly-01-thumb.webp
│       │   │   ├── club-assembly-01.webp
│       │   │   ├── club-assembly-02-thumb.webp
│       │   │   ├── club-assembly-02.webp
│       │   │   ├── club-assembly-03-thumb.webp
│       │   │   ├── club-assembly-03.webp
│       │   │   ├── club-assembly-04-thumb.webp
│       │   │   ├── club-assembly-04.webp
│       │   │   ├── club-assembly-05-thumb.webp
│       │   │   ├── club-assembly-05.webp
│       │   │   ├── club-assembly-06-thumb.webp
│       │   │   ├── club-assembly-06.webp
│       │   │   ├── club-assembly-07-thumb.webp
│       │   │   └── club-assembly-07.webp
│       │   ├── club-installation/
│       │   │   ├── club-installation-01-thumb.webp
│       │   │   ├── club-installation-01.webp
│       │   │   ├── club-installation-02-thumb.webp
│       │   │   ├── club-installation-02.webp
│       │   │   ├── club-installation-03-thumb.webp
│       │   │   ├── club-installation-03.webp
│       │   │   ├── club-installation-04-thumb.webp
│       │   │   ├── club-installation-04.webp
│       │   │   ├── club-installation-05-thumb.webp
│       │   │   ├── club-installation-05.webp
│       │   │   ├── club-installation-06-thumb.webp
│       │   │   ├── club-installation-06.webp
│       │   │   ├── club-installation-07-thumb.webp
│       │   │   ├── club-installation-07.webp
│       │   │   ├── club-installation-08-thumb.webp
│       │   │   ├── club-installation-08.webp
│       │   │   ├── club-installation-09-thumb.webp
│       │   │   ├── club-installation-09.webp
│       │   │   ├── club-installation-10-thumb.webp
│       │   │   └── club-installation-10.webp
│       │   ├── dandiya/
│       │   │   ├── dandiya-01-thumb.webp
│       │   │   ├── dandiya-01.webp
│       │   │   ├── dandiya-02-thumb.webp
│       │   │   └── dandiya-02.webp
│       │   ├── dhanya-sangrahan-2-o/
│       │   │   ├── dhanya-sangrahan-2-o-01-thumb.webp
│       │   │   ├── dhanya-sangrahan-2-o-01.webp
│       │   │   ├── dhanya-sangrahan-2-o-02-thumb.webp
│       │   │   └── dhanya-sangrahan-2-o-02.webp
│       │   ├── diwali-celebration/
│       │   │   ├── diwali-celebration-01-thumb.webp
│       │   │   ├── diwali-celebration-01.webp
│       │   │   ├── diwali-celebration-02-thumb.webp
│       │   │   ├── diwali-celebration-02.webp
│       │   │   ├── diwali-celebration-03-thumb.webp
│       │   │   └── diwali-celebration-03.webp
│       │   ├── gajsanskruti-10-o/
│       │   │   ├── gajsanskruti-10-o-01-thumb.webp
│       │   │   ├── gajsanskruti-10-o-01.webp
│       │   │   ├── gajsanskruti-10-o-02-thumb.webp
│       │   │   └── gajsanskruti-10-o-02.webp
│       │   ├── installation-ceremony-2025-26/
│       │   │   └── cover.webp
│       │   ├── mahadaan-12-o/
│       │   │   ├── mahadaan-12-o-01-thumb.webp
│       │   │   └── mahadaan-12-o-01.webp
│       │   ├── moasic-art/
│       │   │   ├── moasic-art-01-thumb.webp
│       │   │   ├── moasic-art-01.webp
│       │   │   ├── moasic-art-02-thumb.webp
│       │   │   └── moasic-art-02.webp
│       │   ├── morning-momenta/
│       │   │   ├── morning-momenta-01-thumb.webp
│       │   │   ├── morning-momenta-01.webp
│       │   │   ├── morning-momenta-02-thumb.webp
│       │   │   └── morning-momenta-02.webp
│       │   ├── samayati-4-o/
│       │   │   ├── samayati-4-o-01-thumb.webp
│       │   │   ├── samayati-4-o-01.webp
│       │   │   ├── samayati-4-o-02-thumb.webp
│       │   │   ├── samayati-4-o-02.webp
│       │   │   ├── samayati-4-o-03-thumb.webp
│       │   │   ├── samayati-4-o-03.webp
│       │   │   ├── samayati-4-o-04-thumb.webp
│       │   │   ├── samayati-4-o-04.webp
│       │   │   ├── samayati-4-o-05-thumb.webp
│       │   │   ├── samayati-4-o-05.webp
│       │   │   ├── samayati-4-o-06-thumb.webp
│       │   │   └── samayati-4-o-06.webp
│       │   ├── smash-rally-vibe/
│       │   │   ├── smash-rally-vibe-01-thumb.webp
│       │   │   ├── smash-rally-vibe-01.webp
│       │   │   ├── smash-rally-vibe-02-thumb.webp
│       │   │   ├── smash-rally-vibe-02.webp
│       │   │   ├── smash-rally-vibe-03-thumb.webp
│       │   │   ├── smash-rally-vibe-03.webp
│       │   │   ├── smash-rally-vibe-04-thumb.webp
│       │   │   ├── smash-rally-vibe-04.webp
│       │   │   ├── smash-rally-vibe-05-thumb.webp
│       │   │   └── smash-rally-vibe-05.webp
│       │   └── sugandh-1-o/
│       │       ├── sugandh-1-o-01-thumb.webp
│       │       ├── sugandh-1-o-01.webp
│       │       ├── sugandh-1-o-02-thumb.webp
│       │       ├── sugandh-1-o-02.webp
│       │       ├── sugandh-1-o-03-thumb.webp
│       │       ├── sugandh-1-o-03.webp
│       │       ├── sugandh-1-o-04-thumb.webp
│       │       └── sugandh-1-o-04.webp
│       ├── logo/
│       │   ├── legends-logo-sm.png
│       │   ├── legends-logo-sm.webp
│       │   ├── legends-logo.png
│       │   └── legends-logo.webp
│       ├── partners/
│       │   └── sat-mavale-sanvardhan-sanstha.webp
│       ├── previous-year/
│       │   ├── previous-year-01-thumb.webp
│       │   ├── previous-year-01.webp
│       │   ├── previous-year-02-thumb.webp
│       │   ├── previous-year-02.webp
│       │   ├── previous-year-03-thumb.webp
│       │   ├── previous-year-03.webp
│       │   ├── previous-year-04-thumb.webp
│       │   ├── previous-year-04.webp
│       │   ├── previous-year-05-thumb.webp
│       │   ├── previous-year-05.webp
│       │   ├── previous-year-06-thumb.webp
│       │   ├── previous-year-06.webp
│       │   ├── previous-year-07-thumb.webp
│       │   ├── previous-year-07.webp
│       │   ├── previous-year-08-thumb.webp
│       │   ├── previous-year-08.webp
│       │   ├── previous-year-09-thumb.webp
│       │   ├── previous-year-09.webp
│       │   ├── previous-year-10-thumb.webp
│       │   ├── previous-year-10.webp
│       │   ├── previous-year-11-thumb.webp
│       │   ├── previous-year-11.webp
│       │   ├── previous-year-12-thumb.webp
│       │   ├── previous-year-12.webp
│       │   ├── previous-year-13-thumb.webp
│       │   ├── previous-year-13.webp
│       │   ├── previous-year-14-thumb.webp
│       │   ├── previous-year-14.webp
│       │   ├── previous-year-15-thumb.webp
│       │   ├── previous-year-15.webp
│       │   ├── previous-year-16-thumb.webp
│       │   ├── previous-year-16.webp
│       │   ├── previous-year-17-thumb.webp
│       │   ├── previous-year-17.webp
│       │   ├── previous-year-18-thumb.webp
│       │   ├── previous-year-18.webp
│       │   ├── previous-year-19-thumb.webp
│       │   ├── previous-year-19.webp
│       │   ├── previous-year-20-thumb.webp
│       │   ├── previous-year-20.webp
│       │   ├── previous-year-21-thumb.webp
│       │   ├── previous-year-21.webp
│       │   ├── previous-year-22-thumb.webp
│       │   ├── previous-year-22.webp
│       │   ├── previous-year-23-thumb.webp
│       │   ├── previous-year-23.webp
│       │   ├── previous-year-24-thumb.webp
│       │   ├── previous-year-24.webp
│       │   ├── previous-year-25-thumb.webp
│       │   ├── previous-year-25.webp
│       │   ├── previous-year-26-thumb.webp
│       │   ├── previous-year-26.webp
│       │   ├── previous-year-27-thumb.webp
│       │   ├── previous-year-27.webp
│       │   ├── previous-year-28-thumb.webp
│       │   ├── previous-year-28.webp
│       │   ├── previous-year-29-thumb.webp
│       │   ├── previous-year-29.webp
│       │   ├── previous-year-30-thumb.webp
│       │   ├── previous-year-30.webp
│       │   ├── previous-year-31-thumb.webp
│       │   ├── previous-year-31.webp
│       │   ├── previous-year-32-thumb.webp
│       │   ├── previous-year-32.webp
│       │   ├── previous-year-33-thumb.webp
│       │   ├── previous-year-33.webp
│       │   ├── previous-year-34-thumb.webp
│       │   ├── previous-year-34.webp
│       │   ├── previous-year-35-thumb.webp
│       │   ├── previous-year-35.webp
│       │   ├── previous-year-36-thumb.webp
│       │   └── previous-year-36.webp
│       ├── sponsors/
│       │   ├── just-in-time.webp
│       │   ├── laddli-paithani.webp
│       │   ├── shree-radhe-pearls.webp
│       │   └── sucreve.webp
│       ├── team/
│       │   ├── aditi-shrinewar.webp
│       │   ├── akash-patil-2024-25.webp
│       │   ├── arya-kalambe.webp
│       │   ├── asawari-nikam.webp
│       │   ├── atharva-yadav.webp
│       │   ├── ayushi-gupta.webp
│       │   ├── chaitrali-khedkar.webp
│       │   ├── mohit-teke.webp
│       │   ├── prasanna-tayade.webp
│       │   ├── rohit-pawar.webp
│       │   ├── rohit-thakre.webp
│       │   ├── sahil-deole.webp
│       │   ├── samruddhi-desale.webp
│       │   ├── sarvesh-bhosale-2025-26.webp
│       │   ├── shamal-dandgavhal.webp
│       │   ├── shreya-kotkar.webp
│       │   ├── shrinidhi-gundewar.webp
│       │   └── shruti-khedkar.webp
│       └── venues/
│           ├── anushree-banquet-hall.webp
│           └── dwellion-300.webp
├── review-needed/
│   ├── README.md
│   ├── badminton-meet-NEEDS-NAME/
│   │   ├── photo-01.webp
│   │   ├── photo-16.webp
│   │   └── photo-27.webp
│   ├── club-meeting-banner-room-NEEDS-NAME/
│   │   ├── photo-02.webp
│   │   ├── photo-22.webp
│   │   └── photo-24.webp
│   ├── grain-collection-NEEDS-YEAR/
│   │   ├── photo-25.webp
│   │   └── photo-26.webp
│   ├── installation-ceremony-possibly-related-UNCONFIRMED/
│   │   ├── photo-09.webp
│   │   ├── photo-11.webp
│   │   └── photo-30.webp
│   ├── rashtriya-kala-manch-NEEDS-NAME/
│   │   ├── photo-04.webp
│   │   └── photo-10.webp
│   ├── snog-soda-shop-NEEDS-NAME/
│   │   ├── photo-20.webp
│   │   └── photo-23.webp
│   ├── ten-year-anniversary-session-NEEDS-NAME/
│   │   └── photo-13.webp
│   ├── unidentified/
│   │   ├── photo-00.webp
│   │   ├── photo-03.webp
│   │   ├── photo-05.webp
│   │   ├── photo-06.webp
│   │   ├── photo-07.webp
│   │   ├── photo-08.webp
│   │   ├── photo-12.webp
│   │   ├── photo-14.webp
│   │   ├── photo-15.webp
│   │   ├── photo-17.webp
│   │   ├── photo-18.webp
│   │   ├── photo-21.webp
│   │   ├── photo-28.webp
│   │   ├── photo-31.webp
│   │   ├── photo-32.webp
│   │   ├── photo-33.webp
│   │   ├── photo-34.webp
│   │   └── photo-35.webp
│   └── veer-baji-pasalkar-memorial-visit-NEEDS-NAME/
│       └── photo-19.webp
├── scripts/
│   ├── audit-event-photos.mjs
│   ├── check-content.mjs
│   ├── setup-keys.ps1
│   └── ts-loader.mjs
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── audit/
│   │   │   │   └── page.tsx
│   │   │   ├── contributions/
│   │   │   │   └── page.tsx
│   │   │   ├── gamification/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── members/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── apple-icon.png
│   │   ├── board-admin/
│   │   │   ├── audit/
│   │   │   │   └── page.tsx
│   │   │   ├── contributions/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── gamification/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── members/
│   │   │   │   └── page.tsx
│   │   │   ├── operations/
│   │   │   │   ├── announcements/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── attendance/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── events/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── tasks/
│   │   │   │       └── page.tsx
│   │   │   └── page.tsx
│   │   ├── collaborations/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── events/
│   │   │   ├── [slug]/
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── icon.png
│   │   ├── join/
│   │   │   └── page.tsx
│   │   ├── journey/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── legend-zone/
│   │   │   ├── README.md
│   │   │   ├── [...slug]/
│   │   │   │   └── page.zone.tsx
│   │   │   ├── achievements/
│   │   │   │   └── page.zone.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.zone.tsx
│   │   │   ├── layout.zone.tsx
│   │   │   ├── leaderboard/
│   │   │   │   └── page.zone.tsx
│   │   │   ├── not-found.zone.tsx
│   │   │   └── page.zone.tsx
│   │   ├── manifest.ts
│   │   ├── manifesto/
│   │   │   └── page.tsx
│   │   ├── member-dashboard/
│   │   │   ├── achievements/
│   │   │   │   └── page.tsx
│   │   │   ├── announcements/
│   │   │   │   └── page.tsx
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   ├── contributions/
│   │   │   │   └── page.tsx
│   │   │   ├── directory/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── events/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── leaderboard/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── tasks/
│   │   │       └── page.tsx
│   │   ├── member-login/
│   │   │   └── page.tsx
│   │   ├── members/
│   │   │   ├── dashboard/
│   │   │   │   ├── achievements/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── announcements/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── attendance/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── contributions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── directory/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── events/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── leaderboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── tasks/
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── not-found.tsx
│   │   ├── opengraph-image.alt.txt
│   │   ├── opengraph-image.png
│   │   ├── our-story/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── partners/
│   │   │   └── page.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── team/
│   │   │   ├── [slug]/
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── template.tsx
│   │   ├── twitter-image.alt.txt
│   │   └── twitter-image.png
│   ├── components/
│   │   ├── collaborations/
│   │   │   ├── CollaborationStats.tsx
│   │   │   └── WhyCollaborate.tsx
│   │   ├── events/
│   │   │   ├── ComingSoon.tsx
│   │   │   ├── CoverImage.tsx
│   │   │   ├── CurrentYearEvents.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventGallery.tsx
│   │   │   ├── EventHero.tsx
│   │   │   ├── EventHighlights.tsx
│   │   │   ├── EventMetadata.tsx
│   │   │   ├── EventNavigation.tsx
│   │   │   ├── EventsJumpNav.tsx
│   │   │   ├── ImageLightbox.tsx
│   │   │   ├── PreviousYearRecap.tsx
│   │   │   ├── PreviousYearSlideshow.tsx
│   │   │   ├── RedirectToRecap.tsx
│   │   │   ├── RelatedEvents.tsx
│   │   │   ├── ShareEvent.tsx
│   │   │   └── UpcomingEvents.tsx
│   │   ├── forms/
│   │   │   ├── EnquiryForm.tsx
│   │   │   ├── EnquiryFormLink.tsx
│   │   │   ├── EnquiryTypeSelector.tsx
│   │   │   ├── JoinEnquiry.tsx
│   │   │   └── OfficialFormPanel.tsx
│   │   ├── layout/
│   │   │   ├── BackToTop.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── MobileDock.tsx
│   │   │   ├── MobileMenu.tsx
│   │   │   ├── MotionProvider.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── OrganizationJsonLd.tsx
│   │   │   ├── PointerFX.tsx
│   │   │   ├── RedirectToPartners.tsx
│   │   │   ├── RouteRedirect.tsx
│   │   │   ├── SiteFrame.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── legend-zone/
│   │   │   ├── AchievementCard.tsx
│   │   │   ├── AchievementsView.tsx
│   │   │   ├── AnimatedNumber.tsx
│   │   │   ├── ContributionSelector.tsx
│   │   │   ├── DemoActivityList.tsx
│   │   │   ├── DemoDashboard.tsx
│   │   │   ├── DemoLeaderboard.tsx
│   │   │   ├── LevelBadge.tsx
│   │   │   ├── PrototypeNotice.tsx
│   │   │   ├── XPProgress.tsx
│   │   │   ├── ZoneHeader.tsx
│   │   │   ├── ZoneNav.tsx
│   │   │   └── ZoneProvider.tsx
│   │   ├── manifesto/
│   │   │   ├── ClosingStatement.tsx
│   │   │   ├── ManifestoFull.tsx
│   │   │   ├── ManifestoHero.tsx
│   │   │   ├── ManifestoNav.tsx
│   │   │   ├── ManifestoSequence.tsx
│   │   │   ├── ReflectionDemo.tsx
│   │   │   └── RevealWords.tsx
│   │   ├── members-hub/
│   │   │   ├── AdminConsole.tsx
│   │   │   ├── AdminLoginForm.tsx
│   │   │   ├── AdminOperationsPage.tsx
│   │   │   ├── AdminPortalLayout.tsx
│   │   │   ├── AdminShell.tsx
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── GamificationView.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── MemberShell.tsx
│   │   │   ├── OperationsManager.tsx
│   │   │   └── OperationsView.tsx
│   │   ├── partners/
│   │   │   ├── PartnerCard.tsx
│   │   │   ├── PartnerGroup.tsx
│   │   │   ├── PartnerJumpNav.tsx
│   │   │   └── PartnersPreview.tsx
│   │   ├── sections/
│   │   │   ├── BoardShowcase.tsx
│   │   │   ├── Bubbles.tsx
│   │   │   ├── ClubJourney.tsx
│   │   │   ├── FeaturedEvents.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── ImpactStats.tsx
│   │   │   ├── JoinSection.tsx
│   │   │   ├── JourneyPreview.tsx
│   │   │   ├── JourneyTimelineSection.tsx
│   │   │   ├── ManifestoPreview.tsx
│   │   │   ├── TeamArchive.tsx
│   │   │   └── ThemeSection.tsx
│   │   ├── shared/
│   │   │   ├── CTASection.tsx
│   │   │   ├── LeadershipCard.tsx
│   │   │   ├── PageHero.tsx
│   │   │   └── YearTimeline.tsx
│   │   └── ui/
│   │       ├── Breadcrumbs.tsx
│   │       ├── Button.tsx
│   │       ├── Container.tsx
│   │       ├── Counter.tsx
│   │       ├── Reveal.tsx
│   │       ├── SectionHeading.tsx
│   │       └── SiteImage.tsx
│   ├── config/
│   │   └── features.ts
│   ├── data/
│   │   ├── board.ts
│   │   ├── club.ts
│   │   ├── events.ts
│   │   ├── leadership.ts
│   │   ├── legendZone.ts
│   │   ├── manifesto.ts
│   │   ├── partners.ts
│   │   ├── previousYear.ts
│   │   └── story.ts
│   ├── lib/
│   │   ├── animations.ts
│   │   ├── enquiry.ts
│   │   ├── legendZone.ts
│   │   ├── members-hub/
│   │   │   ├── admin.ts
│   │   │   └── operations.ts
│   │   ├── seo.ts
│   │   ├── site.ts
│   │   ├── supabase/
│   │   │   └── browser.ts
│   │   └── utils.ts
│   └── types/
│       ├── css.d.ts
│       └── index.ts
├── supabase/
│   ├── config.toml
│   ├── functions/
│   │   ├── .env.example
│   │   ├── invite-member/
│   │   │   └── index.ts
│   │   └── submit-enquiry/
│   │       ├── email.ts
│   │       ├── handler.test.ts
│   │       ├── handler.ts
│   │       ├── index.ts
│   │       └── validation.ts
│   ├── migrations/
│   │   ├── 20261108000000_create_enquiries.sql
│   │   ├── 20261121000000_create_members_hub.sql
│   │   ├── 20261122000000_members_hub_phase2_operations.sql
│   │   ├── 20261123000000_members_hub_phase3_admin_gamification.sql
│   │   ├── 20261124000000_three_portal_office_bearer_security.sql
│   │   └── 20261125000000_require_admin_role_and_restore_verified_office_bearers.sql
│   └── tests/
│       ├── members_hub_phase2_rls.sql
│       ├── members_hub_phase3_security.sql
│       ├── members_hub_rls.sql
│       └── three_portals_security.sql
├── tailwind.config.ts
├── tests/
│   ├── members-hub-phase2.test.mjs
│   ├── members-hub-phase3.test.mjs
│   ├── members-hub-security.test.mjs
│   └── three-portals-security.test.mjs
└── tsconfig.json
```

Total ZIP entries: 558.
