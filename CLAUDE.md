# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Carnalysis is a tool to scrape/analyze Copart vehicle auction listings and calculate the expected Return on Investment (ROI) for each car — factoring in auction price, repair estimates, and resale value.

## Setup & Commands

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in EBAY_CLIENT_ID and EBAY_CLIENT_SECRET
uvicorn main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `/docs`.

## Architecture

The project is in its initial phase. As it grows, the core responsibilities are expected to be:

- **Data ingestion** — fetching or scraping vehicle listings from Copart
- **Analysis engine** — computing ROI from auction price, repair cost estimates, and resale value
- **Output/reporting** — surfacing results to the user (CLI, web UI, or export)

Update this section as the architecture takes shape.