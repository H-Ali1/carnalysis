import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Carnalysis — Copart ROI",
  version: "0.1.0",
  description: "Scrapes a Copart UK lot page and shows the estimated salvage ROI.",
  icons: {},
  content_scripts: [
    {
      matches: [
        "https://www.copart.co.uk/lot/*",
        "https://www.copart.com/lot/*",
      ],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  host_permissions: [
    "http://localhost:8000/*",
    "http://localhost:8001/*",
    "http://127.0.0.1:8000/*",
    "http://127.0.0.1:8001/*",
    "https://api.postcodes.io/*",
  ],
});
