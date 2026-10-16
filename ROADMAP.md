# Carnalysis — Project Roadmap

> **Key finding (May 2026):** On a Copart guest account, both VIN and VRN are masked. However, the lot title
> ("2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR") exposes Make/Model/Year/Trim/Engine, and the page already
> shows Copart's own "Estimated retail value" field. This removes two of the three original Phase 1 blockers
> without needing any external API or a paid member account.
>
> **Decision (May 2026):** VIN/VRM decode (DVLA/VIN APIs) is **dropped entirely**. Members can see VIN/VRN and
> guests can't, but the lot title already exposes Make/Model/Year/Engine for both, so an external lookup would
> only re-derive data already on the page. Car colour — the one genuinely extra field — will instead be sampled
> from the lot photos in Phase 4, reusing the Phase 2 YOLO panel masks (no external API needed).

---

## Phase 1 — Backend API ✅

**Goal:** A backend that takes a lot's details and returns a complete ROI breakdown.

### Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Parse lot title for Make/Model/Year/Trim/Engine (replaces VIN decode for v1) | Done — `backend/app/vehicle.py`, smart title-case handles acronyms (TT, BMW, XC90) |
| 2 | Scrape Copart "Estimated retail value" field as ARV | Done — label-based extraction in `packages/core/src/extract/extract.ts` |
| 3 | SQLite caching for lots and eBay price history | Pending |
| 1b | VIN/VRM decode via DVLA API | Dropped — title already exposes make/model/year/engine |

### What's working
- FastAPI `POST /analyze` endpoint — accepts lot title, hammer price, ARV, damage observations
- Lot title parser — extracts Make/Model/Year, handles multi-word makes and acronyms
- eBay Browse API part price lookup — concurrent, median-priced, UK used listings, condition ID `{3000}`
- ROI formula — hammer price + Copart fees (12%) + parts + transport
- Unpriced parts are reported in `warnings` (and as `parts_cost: null`) rather than counted as £0
- CORS middleware — the clients can reach the backend from the Copart page
- Transport cost — accepts a distance-based quote from the client; falls back to flat £150
- Test suite (pytest, external APIs faked), Ruff, and mypy in strict mode, all run in CI

### Blockers
- **No data persistence** — every request re-queries eBay from scratch. SQLite caching (Task 3) reduces API quota usage and latency.

---

## Phase 2 — YOLO Damage Detection ⏳

**Goal:** Pass Copart lot image URLs to the backend and have it automatically identify which panels are damaged
and how severely, replacing all manual `damage_observations` input.

### Tasks
| # | Task | Status |
|---|------|--------|
| 4 | Label training dataset (CarDD, VehiDE, Car Parts datasets) | Pending |
| 5 | Fine-tune YOLOv11 on labeled car panel/damage data | Pending |

### What's working
- `backend/app/damage.py` is fully wired — setting `DAMAGE_MODEL_PATH` to fine-tuned weights feeds detections
  straight into the eBay lookup and ROI calc with no other changes needed
- Detections across photos are collapsed to the most severe damage per panel, so each part is priced once
- Up to 5 images processed per lot (capped to limit latency)
- Copart lot pages expose up to 14 HD images — ample input for the model

### Blockers
- **No fine-tuned model** — stock YOLO weights are generic object detectors with no concept of panels or damage
  types. The `panel:damage_type` label format the pipeline needs will never come from a pre-trained model,
  so detection stays disabled (HTTP 501) until a trained model exists.
- **Training data labelling is manual work** — CarDD and VehiDE datasets exist but require labelling in the
  exact `panel:damage_type` format before training can begin.
- **GPU required for training** — fine-tune on Google Colab (free tier) or a cloud VM if no local CUDA GPU.
- **Phase 2 does not block Phase 1 or Phase 3** — the manual `damage_observations` path works now, and the
  extension passes Copart's own "Primary damage / Secondary damage" fields as a hint.

---

## Phase 3 — Chrome Extension ✅

**Goal:** A browser extension that injects a "Calculate ROI" button on Copart UK lot pages. One click extracts
all required data from the page and renders a full profit breakdown as an overlay — no copy-pasting, no manual
inputs.

### Data the extension extracts (all visible on guest account)
| Field | Source on page |
|---|---|
| Make / Model / Year / Trim / Engine | Lot title (H1) |
| Lot number | Subtitle line |
| Current bid / Buy It Now | Bidding panel |
| Estimated retail value (ARV) | Details panel |
| Primary damage / Secondary damage | Details panel |
| Colour | Details panel |
| Odometer / Fuel / Body style | Details panel |
| Yard name | Sale name / Location field |
| Images (up to 14) | Lot gallery |

### Tasks
| # | Task | Status |
|---|------|--------|
| 6 | Build Chrome extension scaffold (React + Vite + CRXJS) | Done |
| 7 | Inject "Calculate ROI" button on Copart lot pages | Done — follows client-side navigation, so lots reached from search results work |
| 8 | Content script to extract all visible lot fields | Done — label-based extraction from `@carnalysis/core` |
| 9 | Render ROI breakdown as overlay UI | Done — shadow DOM overlay, editable inputs, max bid buttons |

### What's working
- Full overlay: scraped summary, hammer/ARV inputs, damage editor, ROI breakdown
- Transport cost — distance-based (postcodes.io + Haversine, £1.50/mile) using user's postcode; falls back to flat £150
- Max bid calculator — "Max bid for £500 profit" and "Max bid for £1k profit" quick buttons
- eBay part prices display in the breakdown (real prices via backend)
- All damage entry is manual pending Phase 2 YOLO; Copart's Primary/Secondary damage shown as a hint

### Remaining
- **Selectors need live-DOM confirmation** — extraction uses best-effort label strings. Verify any fields
  showing `—` by inspecting the real Copart page and updating `LABELS` in
  `packages/core/src/extract/extract.ts`.

---

## Phase 4 — Parts Pricing Refinement

**Goal:** Improve eBay part price accuracy with trim/paint/OEM filtering. Derive vehicle colour from lot photos
(by sampling within Phase 2 YOLO panel masks) to match painted parts. Use SQLite price history to stabilise
estimates over time.

### Tasks
| # | Task | Status |
|---|------|--------|
| 10 | Improve eBay search accuracy with trim/paint/OEM filters (from title parse) | Pending |
| 11 | Derive car colour from lot photos (sample pixels within YOLO panel masks) for painted-part matching | Pending |
| 12 | AutoTrader/Marketcheck UK cross-check for ARV validation | Pending |

### What's working
- Median price from 10 eBay UK used listings is a reasonable baseline.

### Blockers
- **Colour from photos is approximate** — sampling pixels within YOLO panel masks gives a rough colour
  ("black"), not an exact paint code. Good enough for loose eBay matching; exact codes are out of scope.
- **SQLite caching (Task 3) must land first** — price history smoothing requires stored data.
- **eBay result quality varies** — the search terms in `backend/app/panels.py` may return wrong-side parts or
  aftermarket panels.

---

## Phase 5 — Mobile App (Expo) 🚧 MVP built

**Goal:** Customers are phone-first — replace "install a Chrome extension" with an app. Browse Copart UK
in an embedded WebView, one-tap ROI analysis, then hand off to the Copart app/mobile site to place the bid
(bidding stays 100% on Copart's side).

> **Decision (July 2026):** No server-side Copart scraping. Copart runs Imperva bot management — the same
> class of protection that forced dropping the AutoTrader call. Instead the lot page renders in a WebView on
> the **user's own device** and is read by an injected script — generated from the same extractor the
> extension's content script uses. Share-sheet intake and a paid scraping API were considered; WebView won
> on risk and effort.

### Tasks
| # | Task | Status |
|---|------|--------|
| 13 | Expo scaffold (SDK 57) + WebView browse + injected label-based extraction | Done — `mobile/`, extraction covered by jsdom fixture tests |
| 14 | Analysis sheet (port of extension Overlay: transport, damage editor, max-bid) | Done — plus editable title + full manual-entry mode as scrape fallback |
| 15 | Bid handoff — "Place bid on Copart" opens the lot URL via the OS | Done — opens Copart app if it claims copart.co.uk links, else mobile site; confirm on-device |
| 16 | Verify extraction labels against the live Copart UK *mobile* DOM | Pending — same caveat as Phase 3 desktop selectors |
| 17 | Host the backend publicly (HTTPS) + rate limiting; app currently targets a LAN backend | Pending |
| 18 | Share-sheet intake (share a lot from the Copart app → Carnalysis) | Pending — needs an Expo dev build (share-intent), v1.1 |
| 19 | Shared `@carnalysis/core` package for both clients | Done — one extractor (the WebView script is generated from it), API types, transport and profit maths |

### What's working
- Full flow in Expo Go: browse → Analyse ROI on a lot page → breakdown → Place bid on Copart
- Same backend and the same `@carnalysis/core` logic as the extension — no copied code between clients
- Manual ROI mode from any page — analysis works even if Copart changes their DOM

---

## Dependency Map

```
Phase 1 (title parse, ARV scrape, SQLite)
    └── Phase 3 (extension consumes Phase 1 backend)  ← both complete
    └── Phase 4 (better eBay queries build on title parse)

Phase 2 (YOLO fine-tuning) — independent, runs in parallel
    └── Phase 4 (colour sampling reuses YOLO panel masks for painted-part matching)

Phase 3 (extension)
    └── Phase 4 (SQLite caching useful before price history matters)

Phase 5 (mobile app) — consumes the same Phase 1 backend, unchanged
    └── public backend hosting (Task 17) gates any app-store release
```

## Suggested Build Order (remaining work)

1. **Live-DOM label check on mobile** (Phase 5, Task 16) — quick, unblocks real-device use of the app
2. **YOLO labelling + training** (Phase 2, Tasks 4–5) — GPU-dependent, do on Google Colab
3. **SQLite caching** (Phase 1, Task 3) — reduce eBay API calls
4. **Backend hosting + share-sheet intake** (Phase 5, Tasks 17–18) — pre-release requirements for the app
5. **eBay + colour refinement** (Phase 4, Tasks 10–12) — post-YOLO accuracy improvement
