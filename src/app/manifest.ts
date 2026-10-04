import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harbour Household Finance",
    short_name: "Harbour",
    description: "Private household cash flow, budgets and forecasts.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#356c57",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
