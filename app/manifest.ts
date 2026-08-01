import type { MetadataRoute } from "next";
import { APP_TITLE } from "@/lib/app-title";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_TITLE,
    short_name: "Beads",
    description: "A local web UI for the beads (bd) issue tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0f",
    theme_color: "#0c0c0f",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
