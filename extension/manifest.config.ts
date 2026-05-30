import { defineManifest } from "@crxjs/vite-plugin";

// Copart serves both copart.co.uk (UK) and copart.com. v1 targets UK lot pages.
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
  // Allow the content script to reach the locally-running FastAPI backend.
  host_permissions: ["http://localhost:8000/*", "http://127.0.0.1:8000/*"],
});
