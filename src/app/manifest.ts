import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nasz ślub",
    short_name: "Ślub",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#5d6b4f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
