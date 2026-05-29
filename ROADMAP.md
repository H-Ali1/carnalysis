# Carnalysis — Project Roadmap

> **Key finding (May 2026):** On a Copart guest account, both VIN and VRN are masked. However, the lot title
> ("2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR") exposes Make/Model/Year/Trim/Engine, and the page already
> shows Copart's own "Estimated retail value" field. This removes two of the three original Phase 1 blockers
> without needing any external API or a paid member account.

---

## Phase 1 — Backend API

**Goal:** A fully automated backend that takes a Copart lot URL and returns a complete ROI breakdown without any manual inputs.

### Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Parse lot title for Make/Model/Year/Trim/Engine (replaces VIN decode for v1) | Pending |
| 2 | Scrape Copart "Estimated retail value" field as ARV (replaces AutoTrader integration for v1) | Pending |
| 3 | SQLite caching for lots and eBay price history | Pending |
| 1b | VIN/VRM decode via DVLA API — deferred, requires Copart member account to unlock VIN | Deferred |

### What's working
- eBay Browse API part price lookup (concurrent, median-priced, UK used listings)
- ROI formula — hammer price + Copart fees (12%) + parts + labour + transport (£150 flat)
- Manual damage input path (`damage_observations` in request body) is fully functional

### Blockers
- **Vehicle identity is title-only for now** — VIN and VRN are both masked on guest accounts. Lot title parsing
  gives sufficient Make/Model/Year/Trim for v1 eBay queries. VIN decode requires a paid Copart member account
  and is deferred to Phase 4.
- **ARV now solved** — Copart's "Estimated retail value" field is visible on the lot page without an account.
  The extension scrapes it directly. AutoTrader/Marketcheck is no longer a v1 dependency.
- **No data persistence** — every request re-queries eBay from scratch. Repeated lookups for the same vehicle
  waste API quota and add latency.
- **Hammer price is live bid data** — current bid and Buy It Now price are visible on the page and serve as
  the hammer price input. No external data source needed.

---

## Phase 2 — YOLO Damage Detection

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
  extension can pass Copart's own "Primary damage / Secondary damage" fields as a fallback.

---

## Phase 3 — Chrome Extension

**Goal:** A browser extension that injects a "Calculate ROI" button on Copart UK lot pages. One click extracts
all required data from the page and renders a full profit breakdown as an overlay — no copy-pasting, no manual
inputs.

### Data the extension will extract (all visible on guest account)
| Field | Source on page |
|---|---|
| Make / Model / Year / Trim / Engine | Lot title (H1) |
| Lot number | Subtitle line |
| Current bid / Buy It Now | Bidding panel |
| Estimated retail value (ARV) | Details panel |
| Primary damage / Secondary damage | Details panel |
| Colour | Details panel |
| Odometer / Fuel / Body style | Details panel |
| Images (up to 14) | Lot gallery |

### Tasks
| # | Task | Status |
|---|------|--------|
| 6 | Build Chrome extension scaffold (React + Vite + CRXJS) | Pending |
| 7 | Inject "Calculate ROI" button on Copart lot pages | Pending |
| 8 | Content script to extract all visible lot fields (see table above) | Pending |
| 9 | Render ROI breakdown as overlay UI | Pending |

### What's working
- Nothing yet — Phase 3 has not started.

### Blockers
- **VIN/VRM are masked** — confirmed on guest account. Extension uses lot title for vehicle ID and skips
  VIN/VRM entirely for v1. This is acceptable; see Task 1.
- **Copart uses Imperva/Akamai bot protection** — the extension runs as a real user browser session which
  mitigates this. Avoid background polling or automated navigation.
- **Extension only works while the backend is running locally** — for wider use, the backend needs to be
  hosted (VPS or cloud function). Out of scope for v1.

---

## Phase 4 — Parts Pricing Refinement & VIN Decode

**Goal:** Improve eBay part price accuracy with trim/paint/OEM filtering. Use VIN decode (requires member
account) to get exact paint code and trim level. Use SQLite price history to stabilise estimates over time.

### Tasks
| # | Task | Status |
|---|------|--------|
| 10 | Improve eBay search accuracy with trim/paint/OEM filters (from title parse) | Pending |
| 11 | VIN decode via DVLA API for exact paint code + trim (requires Copart member account) | Pending |
| 12 | AutoTrader/Marketcheck UK cross-check for ARV validation | Pending |

### What's working
- Median price from 10 eBay UK used listings is a reasonable baseline.

### Blockers
- **VIN decode requires member account** — Copart masks VIN for guests. Upgrade path: pay for a Copart
  member account to unlock VIN, then hit DVLA VES API.
- **SQLite caching (Task 3) must land first** — price history smoothing requires stored data.
- **eBay result quality varies** — `PANEL_SEARCH_TERMS` may return wrong-side parts or aftermarket panels.
  Improving this requires iterating on real search results.

---

## Dependency Map

```
Phase 1 (title parse, ARV scrape, SQLite)
    └── Phase 3 (extension consumes Phase 1 backend)
    └── Phase 4 (better eBay queries build on title parse)

Phase 2 (YOLO fine-tuning) — independent, runs in parallel

Phase 3 (extension)
    └── Phase 4 (SQLite caching useful before price history matters)
    └── Phase 4 (VIN decode improves accuracy post-launch)
```

## Suggested Build Order

1. **Lot title parser** (Phase 1, Task 1) — extract Make/Model/Year/Trim/Engine from the H1 string
2. **Copart ARV scrape** (Phase 1, Task 2) — wire "Estimated retail value" field as the ARV input
3. **SQLite caching** (Phase 1, Task 3) — reduce eBay API calls before extension ships
4. **Chrome extension scaffold + data extraction** (Phase 3, Tasks 6–8) — build once backend handles all inputs
5. **ROI overlay UI** (Phase 3, Task 9) — surface the result on the Copart page
6. **YOLO labelling + training** (Phase 2, Tasks 4–5) — parallel workstream, GPU-dependent
7. **eBay + VIN refinement** (Phase 4, Tasks 10–12) — ongoing accuracy improvement post-launch
