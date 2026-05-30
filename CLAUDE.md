# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Carnalysis is a tool to scrape/analyze Copart vehicle auction listings and calculate the expected Return on Investment (ROI) for each car — factoring in auction price, repair estimates, and resale value.

## Setup & Commands

**Backend** (FastAPI):

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in EBAY_CLIENT_ID and EBAY_CLIENT_SECRET
uvicorn main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `/docs`.

**Extension** (Chrome, React + Vite + CRXJS):

```bash
cd extension
npm install
npm run build          # outputs to extension/dist (load unpacked in chrome://extensions)
```

See `extension/README.md` for the full load/dev workflow.

## Architecture

Two subsystems, talking over HTTP:

- **`backend/`** — FastAPI analysis engine. `POST /analyze` takes a lot title (parsed
  into make/model/year by `vehicle.py`), hammer price, ARV, and damage observations,
  then computes ROI (`roi.py`) using eBay part prices (`ebay.py`) and the repair-cost
  strategy in `panel_config.py`. The image/YOLO path (`damage.py`) is stubbed pending a
  fine-tuned model (Phase 2).
- **`extension/`** — Chrome MV3 content script that scrapes a Copart UK lot page and
  renders the ROI breakdown as an overlay. Scraping (`content/extract.ts`, label-based)
  and processing (`content/parse.ts`, pure functions) are kept separate. Calls the
  backend via `api/client.ts`.

See `ROADMAP.md` for phase-by-phase status and `copart_profit_estimator_spec.md` for the
original spec. Vehicle identity is derived from the lot title only — VIN/VRM/DVLA decode
was deliberately dropped (see the ROADMAP "Decision" note).