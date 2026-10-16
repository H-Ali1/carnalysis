# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Carnalysis estimates the profit and ROI of Copart UK salvage auction lots — factoring in the hammer price,
Copart's buyer's fee, used-part prices from eBay, transport, and resale value. It runs as a Chrome extension
and an Expo mobile app, both backed by a FastAPI service.

## Commands

**Backend** (`backend/`, Python 3.11+, uses a local `.venv`):

```bash
pip install -r requirements-dev.txt
cp .env.example .env            # eBay keys optional; without them parts are excluded with a warning
uvicorn app.main:app --reload   # add --host 0.0.0.0 to serve the mobile app
ruff check . && ruff format --check . && mypy && pytest
```

**Shared client package** (`packages/core/`):

```bash
npm install && npm run typecheck && npm test
npm run build:webview-script    # after changing src/extract/ or src/parse.ts; commit the output
```

**Extension** (`extension/`): `npm install && npm run build`, then load `extension/dist` unpacked.

**Mobile** (`mobile/`, Expo SDK 57): `npm install && npx expo start`; `npm run typecheck`. Expo changes
between SDKs — check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before using an API.

**TypeScript lint/format** (repo root): `npm install && npm run lint` (Biome; `npm run format` to fix).

## Architecture

- **`backend/app/`** — FastAPI service. `main.py` wires dependencies and routes; `analysis.py`
  orchestrates a request: resolve the vehicle (`vehicle.py` parses the lot title), resolve damage (manual
  observations, or `damage.py` YOLO detection — disabled until `DAMAGE_MODEL_PATH` is set), price parts that
  need replacing (`pricing.py`, eBay Browse API, injected via `Depends` so tests use a fake), then
  `roi.py`. `panels.py` holds the panel catalogue; `models.py` the API schemas.
- **`packages/core/`** — framework-free TypeScript used by both clients via a `file:` dependency (consumed as
  source, no build): API types and client, panel vocabulary, transport quotes, max-bid maths, colour
  tokens, and `extract/extract.ts`, the label-based lot-page extractor. The mobile WebView can't import
  modules, so `extract/webview-script.generated.ts` is bundled from it by esbuild — never edit it by hand.
- **`extension/`** — Chrome MV3 content script on every copart.co.uk page (Copart is an SPA); shows the
  trigger on `/lot/` pages and mounts `overlay/Overlay.tsx` in a shadow root.
- **`mobile/`** — Expo app. `screens/BrowserScreen.tsx` hosts copart.co.uk in a WebView and injects the
  generated extraction script; `screens/AnalysisSheet.tsx` is the counterpart of the extension's overlay;
  "Place bid on Copart" opens the lot URL so bidding happens on Copart's side. `metro.config.js` watches
  `../packages/core`.

Keep the API contract in sync between `backend/app/models.py` and `packages/core/src/types.ts` (and panel
keys with `packages/core/src/panels.ts`). There is deliberately no server-side Copart scraping (Imperva bot
protection), and vehicle identity comes from the lot title only (VIN/DVLA decode was dropped). See
`ROADMAP.md` for status and decisions, and `docs/original-spec.md` for the original spec.
