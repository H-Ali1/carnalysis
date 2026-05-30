# Carnalysis Extension (Phase 3)

Chrome extension (React + Vite + CRXJS) that injects a **Calculate ROI** button on
Copart UK lot pages, scrapes the lot details, and renders an ROI breakdown from the
FastAPI backend.

## Layout

```
src/
  content/
    extract.ts   # SCRAPING — reads raw values from the Copart DOM (label-based)
    parse.ts     # PROCESSING — pure functions: "£3,450" -> 3450, etc.
    index.tsx    # injects the trigger button, mounts the overlay in a shadow root
  overlay/
    Overlay.tsx  # the ROI panel UI (scraped summary, inputs, damage editor, result)
  api/
    client.ts    # POST /analyze to the backend
  types.ts       # shared types, mirrors backend/models.py + panel_config.py
manifest.config.ts  # MV3 manifest (CRXJS defineManifest)
```

## Develop

```bash
cd extension
npm install
cp .env.example .env   # optional — defaults to http://localhost:8000
npm run dev            # or: npm run build  (outputs to dist/)
```

Then load it in Chrome:

1. Visit `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `extension/dist` folder (after `npm run build`)
   or the Vite dev output.
3. Make sure the backend is running (`uvicorn main:app --reload` in `../backend`).
4. Open a Copart UK lot page; click the **Calculate ROI** button (bottom-right).

## Known TODOs

- **Selectors are best-effort.** `extract.ts` locates fields by label text because
  Copart's CSS classes are obfuscated. Confirm the label strings and image-CDN host
  patterns against a live lot page (right-click a field → Inspect).
- **Damage is manual for now.** Auto damage detection is Phase 2 (YOLO). Until then
  the overlay lets you enter damaged panels by hand; Copart's own "Primary/Secondary
  damage" text is shown as a hint.
