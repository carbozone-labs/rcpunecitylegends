import { readFileSync } from "node:fs";

/** @type {import('next').NextConfig} */
// Set NEXT_PUBLIC_BASE_PATH for hosting under a project subpath, such as GitHub Pages.

// Feature flags live in src/config/features.ts (single source of truth). This file is plain JavaScript and cannot
// import TypeScript, so it reads the flag from that file's text. It fails loudly if the flag cannot be found,
// rather than silently exposing (or hiding) the Legend Zone.
const featuresSource = readFileSync(new URL("./src/config/features.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const legendZoneFlag = featuresSource.match(/legendZoneEnabled\s*:\s*(true|false)\b/);
if (!legendZoneFlag) throw new Error("next.config.mjs: could not read `legendZoneEnabled` from src/config/features.ts");
const legendZoneEnabled = legendZoneFlag[1] === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "";

const nextConfig = {
  reactStrictMode: true,
  // Static export: `npm run build` writes the finished website into the `out/` folder (upload its contents to public_html).
  output: "export",
  basePath,
  // Every page becomes <route>/index.html, which plain Apache serves without any rewrite rules.
  trailingSlash: true,
  // Legend Zone route files are named *.zone.tsx. They are routes only while the feature is enabled; when it is off
  // they are ignored by the router, so nothing under /legend-zone is compiled or exported (see src/app/legend-zone/README.md).
  pageExtensions: legendZoneEnabled ? ["tsx", "ts", "jsx", "js", "zone.tsx"] : ["tsx", "ts", "jsx", "js"],
  // Static hosting has no image optimiser, so /public images are served exactly as they are.
  images: { unoptimized: true },
  devIndicators: false,
  // Import only the icons/animation helpers that are used, so each page compiles less code
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
};
export default nextConfig;
