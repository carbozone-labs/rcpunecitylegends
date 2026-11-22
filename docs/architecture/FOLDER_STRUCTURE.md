# Folder Structure

The root contains framework/package configuration, `README.md`, `.env.example`, and the main project directories.

```text
.
├── .github/
├── archive/
├── docs/
│   ├── administration/
│   ├── architecture/
│   ├── attendance/
│   ├── database/
│   ├── deployment/
│   ├── development/
│   ├── reports/
│   ├── security/
│   └── testing/
├── public/
├── review-needed/
├── scripts/
│   ├── provisioning/
│   ├── utilities/
│   └── validation/
├── src/
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── tests/
└── tests/
```

`node_modules/`, `.next/`, and `out/` are generated directories and are excluded from source control and the delivery ZIP. Existing Next.js routes and Supabase migration names are preserved.
