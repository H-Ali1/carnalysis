import { defineManifest } from "@crxjs/vite-plugin";
import { loadEnv } from "vite";
import pkg from "./package.json";

export default defineManifest(({ mode }) => {
  const backendUrl = loadEnv(mode, ".", "VITE_").VITE_BACKEND_URL || "http://localhost:8000";

  return {
    manifest_version: 3,
    name: "Carnalysis — Copart ROI",
    version: pkg.version,
    description: "Estimates the profit and ROI of a Copart UK salvage lot, right on the lot page.",
    // Remembers the user's postcode between lots.
    permissions: ["storage"],
    // Requests come from the Copart page, so the backend must also allow that origin via
    // CORS (it does by default).
    host_permissions: [`${new URL(backendUrl).origin}/*`, "https://api.postcodes.io/*"],
    content_scripts: [
      {
        // All pages, not just /lot/*: Copart navigates client-side, so a user who reaches
        // a lot from search results never triggers a fresh page load.
        matches: ["https://www.copart.co.uk/*"],
        js: ["src/content/index.tsx"],
        run_at: "document_idle",
      },
    ],
  };
});
