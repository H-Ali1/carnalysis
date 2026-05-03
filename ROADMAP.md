# Carnalysis — Project Roadmap

## Phase 1 — Backend API

**Goal:** A fully automated backend that takes a Copart lot URL (or VIN + hammer price) and returns a complete ROI breakdown without any manual inputs.

### Tasks
| # | Task | Status |
|---|------|--------|
| 1 | VIN/VRM lookup integration | Pending |
| 2 | Automate ARV lookup from AutoTrader/Marketcheck UK | Pending |
| 3 | SQLite caching for lots and eBay price history | Pending |

### What's working
- eBay Browse API part price lookup (concurrent, median-priced, UK used listings)
- ROI formula — hammer price + Copart fees (12%) + parts + labour + transport (£150 flat)
- Manual damage input path (`damage_observations` in request body) is fully functional

### Blockers
- **ARV is manual** — the `arv` field must be provided in every request. Until AutoTrader/Marketcheck scraping or an API is wired up, ROI output is only as good as the user's estimate.
- **VIN decoding not implemented** — without trim/paint code from a decoded VIN, eBay queries are generic and may return irrelevant parts (wrong trim, wrong colour).
- **No data persistence** — every request re-queries eBay from scratch. Repeated lookups for the same vehicle waste API quota and add latency.
- **Copart data not ingested** — hammer price, images, and VIN must still be supplied manually. The extension (Phase 3) is what automates this.

---

## Phase 2 — YOLO Damage Detection

**Goal:** Pass Copart lot image URLs to the backend and have it automatically identify which panels are damaged and how severely, replacing all manual `damage_observations` input.

### Tasks
| # | Task | Status |
|---|------|--------|
| 4 | Label training dataset (CarDD, VehiDE, Car Parts datasets) | Pending |
| 5 | Fine-tune YOLOv11 on labeled car panel/damage data | Pending |

### What's working
- `damage.py` pipeline is fully wired — once a fine-tuned model is in place, it feeds directly into the eBay lookup and ROI calc with no other changes needed
- Up to 5 images processed per lot (capped to limit latency)

### Blockers
- **No fine-tuned model** — `yolo11n.pt` is a generic object detector with no concept of panels or damage types. The `panel:damage_type` label format it needs will never come from a pre-trained model. The image path always returns a 422 error today.
- **Training data labelling is manual work** — CarDD and VehiDE datasets exist but require labelling in the exact `panel:damage_type` format before training can begin.
- **GPU required for training** — fine-tuning YOLOv11 locally needs a CUDA-capable GPU. Use Google Colab or a cloud VM if not available locally.
- **Phase 2 does not block Phase 1** — the manual `damage_observations` path works now. Phase 2 only automates the damage input step.

---

## Phase 3 — Chrome Extension

**Goal:** A browser extension that injects a "Calculate ROI" button on Copart UK lot pages. One click extracts all required data from the page and renders a full profit breakdown as an overlay — no copy-pasting, no manual inputs.

### Tasks
| # | Task | Status |
|---|------|--------|
| 6 | Build Chrome extension scaffold (React + Vite + CRXJS) | Pending |
| 7 | Inject "Calculate ROI" button on Copart lot pages | Pending |
| 8 | Render ROI breakdown as overlay UI | Pending |

### What's working
- Nothing yet — Phase 3 has not started.

### Blockers
- **Depends on Phase 1 ARV automation** — if ARV is still manual, the extension needs an input field for it, which degrades the one-click experience significantly.
- **VIN location in Copart DOM must be confirmed** — the extension content script needs the exact CSS selector or DOM path for the VIN field on a live Copart lot page. Inspect a real lot to confirm before building the extractor.
- **VRM is unreliable** — number plates are sometimes redacted on salvage/write-off listings. The extension should use VIN as the primary identifier and treat VRM as optional.
- **Copart uses Imperva/Akamai bot protection** — automated or scripted requests to Copart may be blocked. The extension mitigates this by running as a real user browser session, but aggressive polling or background fetching could still trigger rate limiting.
- **Extension only works while the backend is running locally** — for wider use, the backend needs to be hosted (e.g. a VPS or cloud function).

---

## Phase 4 — Parts Pricing Refinement

**Goal:** Improve eBay part price accuracy by incorporating trim level, paint code, and OEM vs aftermarket filtering into search queries. Use historical price data from SQLite to stabilise estimates over time.

### Tasks
| # | Task | Status |
|---|------|--------|
| 9 | Improve eBay search accuracy with trim/paint/OEM filters | Pending |

### What's working
- Median price from 10 eBay UK used listings is a reasonable baseline but has no vehicle-specific filtering.

### Blockers
- **Depends on Phase 1 VIN decoding** — trim and paint code are required inputs for better eBay queries. Without them, searches remain generic.
- **Depends on Phase 3 SQLite caching** — price history smoothing requires stored data from previous lookups.
- **eBay result quality varies** — static `PANEL_SEARCH_TERMS` strings may return wrong-side parts, aftermarket panels, or unrelated listings. Improving this requires iteration and manual verification of search results.

---

## Dependency Map

```
Phase 1 (VIN decode, ARV)
    └── Phase 4 (better eBay queries)
    └── Phase 3 (extension needs automated ARV to be one-click)

Phase 2 (YOLO fine-tuning) — independent, can run in parallel

Phase 3 (extension)
    └── Phase 4 (SQLite caching in place before price history is useful)
```

## Suggested Build Order

1. **VIN decode + DVLA API** (Phase 1, Task 1) — unlocks better eBay queries and ARV lookups
2. **ARV automation** (Phase 1, Task 2) — removes the biggest manual input
3. **SQLite caching** (Phase 1, Task 3) — reduces API load before extension ships
4. **YOLO labelling + training** (Phase 2, Tasks 4–5) — parallel workstream, GPU-dependent
5. **Chrome extension** (Phase 3, Tasks 6–8) — build once backend is fully automated
6. **eBay refinement** (Phase 4, Task 9) — ongoing improvement after initial extension ships
