# Carnalysis Chrome extension

Adds a **Calculate ROI** button to Copart UK lot pages. One click reads the lot, and an overlay
shows the profit and ROI breakdown from the backend.

## Build and load

```bash
npm install
cp .env.example .env   # optional; defaults to http://localhost:8000
npm run build          # or `npm run dev` for hot reload
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `extension/dist`.
3. Start the backend (see [`../backend/README.md`](../backend/README.md)).
4. Open a Copart UK lot page and click **Calculate ROI** (bottom right).

## Layout

```text
src/
  content/index.tsx            content script: shows the button on lot pages, mounts the overlay
  overlay/Overlay.tsx          inputs, damage editor and calculate flow
  overlay/ResultPanel.tsx      breakdown, warnings and max-bid buttons
  overlay/useTransportQuote.ts postcode (kept in extension storage) → transport quote
  overlay/styles.ts            inline styles; the overlay lives in a shadow root
  config.ts                    backend URL
manifest.config.ts             Manifest V3 definition
```

Page extraction, API types and the profit maths come from
[`@carnalysis/core`](../packages/core).

## Notes

- **Single-page app.** The content script runs on every copart.co.uk page and follows
  client-side navigation, because reaching a lot from search results doesn't trigger a page
  load.
- **Field labels are best-effort.** If a field shows `—`, check its label on a live lot page and
  update `LABELS` in [`packages/core/src/extract/extract.ts`](../packages/core/src/extract/extract.ts).
- **Damage entry is manual** until automatic detection lands (ROADMAP, Phase 2). Copart's own
  primary and secondary damage are shown as a hint.
