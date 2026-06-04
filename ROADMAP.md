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

**Goal:** A fully automated backend that takes a Copart lot URL and returns a complete ROI breakdown without any manual inputs.

### Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Parse lot title for Make/Model/Year/Trim/Engine (replaces VIN decode for v1) | Done — `vehicle.py`, smart title-case handles acronyms (TT, BMW, RS) |
| 2 | Scrape Copart "Estimated retail value" field as ARV | Done — extension `extract.ts`, label-based scraping |
| 3 | SQLite caching for lots and eBay price history | Pending |
| 1b | VIN/VRM decode via DVLA API | Dropped — title already exposes make/model/year/engine |

### What's working
- FastAPI `POST /analyze` endpoint — accepts lot title, hammer price, ARV, damage observations
- Lot title parser (`vehicle.py`) — extracts Make/Model/Year, handles multi-word makes and acronyms
- eBay Browse API part price lookup — concurrent, median-priced, UK used listings, condition ID `{3000}`
- ROI formula — hammer price + Copart fees (12%) + parts + transport
- CORS middleware — extension can reach the backend from the Copart page
- Transport cost — accepts calculated value from extension; falls back to flat £150

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
- `damage.py` pipeline is fully wired — once a fine-tuned model is in place, it feeds directly into the eBay
  lookup and ROI calc with no other changes needed
- Up to 5 images processed per lot (capped to limit latency)
- Copart lot pages expose up to 14 HD images — ample input for the model

### Blockers
- **No fine-tuned model** — `yolo11n.pt` is a generic object detector with no concept of panels or damage
  types. The `panel:damage_type` label format it needs will never come from a pre-trained model.
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
| 7 | Inject "Calculate ROI" button on Copart lot pages | Done — fixed position button, re-injects on SPA nav |
| 8 | Content script to extract all visible lot fields | Done — label-based scraping (`extract.ts`) |
| 9 | Render ROI breakdown as overlay UI | Done — shadow DOM overlay, editable inputs, max bid buttons |

### What's working
- Full overlay: scraped summary, hammer/ARV inputs, damage editor, ROI breakdown
- Transport cost — distance-based (postcodes.io + Haversine, £1.50/mile) using user's postcode; falls back to flat £150
- Max bid calculator — "Max bid for £500 profit" and "Max bid for £1k profit" quick buttons
- eBay part prices display in the breakdown (real prices via backend)
- All damage entry is manual pending Phase 2 YOLO; Copart's Primary/Secondary damage shown as a hint

### Remaining
- **Selectors need live-DOM confirmation** — `extract.ts` uses best-effort label strings. Verify any fields
  showing `—` by inspecting the real Copart page and updating the label array in `extract.ts`.

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
- **eBay result quality varies** — `PANEL_SEARCH_TERMS` may return wrong-side parts or aftermarket panels.

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
```

## Suggested Build Order (remaining work)

1. **YOLO labelling + training** (Phase 2, Tasks 4–5) — GPU-dependent, do on Google Colab
2. **SQLite caching** (Phase 1, Task 3) — reduce eBay API calls
3. **eBay + colour refinement** (Phase 4, Tasks 10–12) — post-YOLO accuracy improvement
