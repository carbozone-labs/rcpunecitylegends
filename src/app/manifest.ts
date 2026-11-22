export const dynamic = "force-static";
import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LEGENDS | Rotaract Club of Pune City",
    short_name: "LEGENDS",
    description: "We don’t just build leaders. We create Legends.",
    start_url: withBasePath("/"),
    display: "standalone",
    background_color: "#eaf3ff",
    theme_color: "#eaf3ff",
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
