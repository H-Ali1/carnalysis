# Project Specification: Copart Profit Estimator (CPE)

> **Historical document.** This is the original problem statement the project started from. Several
> parts were deliberately changed during development — VIN/VRM decoding, server-side scraping with
> Playwright and AutoTrader-based ARV were all dropped. See [`ROADMAP.md`](../ROADMAP.md) for the
> decisions and their reasoning, and the [README](../README.md) for the current design.

## 1. Project Overview
A tool designed to automate the ROI analysis for vehicles listed on Copart UK. The system identifies damage via Computer Vision, estimates repair costs by searching for parts on eBay, and calculates potential profit based on market resale values.

## 2. Technical Stack
* **Frontend (Browser Extension):** React + Vite (CRXJS) for the UI overlay on Copart.co.uk.
* **Backend API:** FastAPI (Python) for coordinating AI inference and data aggregation.
* **Computer Vision Model:** YOLOv11 (Ultralytics) for instance segmentation (identifying car panels and specific damage types).
* **Data Aggregation:** Playwright (for scraping/automation) and Official APIs (eBay Browse API).
* **Database:** SQLite for local storage of scanned lots and price history.

## 3. Data Pipeline & Logic
### Step 1: Vehicle Identification
* Extract VIN or VRM from the Copart page.
* Query UK vehicle data APIs to get exact specs (Trim, Paint Code, Engine).

### Step 2: Damage Detection (AI)
* **Model Input:** High-resolution images from the Copart lot gallery.
* **Detection Layers:**
    1.  **Panel Identification:** Detect specific panels (e.g., Front Nearside Wing, Rear Bumper).
    2.  **Damage Classification:** Identify damage types (Dents, Scratches, Cracks, Missing Parts).
* **Datasets for Training:** CarDD, VehiDE, and "Humans in the Loop" Car Parts dataset.

### Step 3: Repair Estimation
* **Parts Search:** Map detected damaged panels to eBay search queries.
* **eBay Logic:** Filter for "Used" condition and "UK" location to find realistic salvage parts.
* **Labor & Paint:** Apply flat-rate multipliers per panel (e.g., £200/panel for paint).

### Step 4: Financial Calculation
* **Hammer Price Prediction:** Based on historical data of similar salvage sales.
* **ARV (After Repair Value):** Pulled from AutoTrader/Marketcheck UK.
* **ROI Formula:**
    $$Profit = Retail Value - (Hammer Price + Copart Fees + Parts + Labor + Transport)$$

## 4. Operational Strategies & Safety
* **Anti-Bot Mitigation:** Use a "Manual Trigger" button in the extension to mimic human behavior and avoid Imperva/Akamai detection.
* **Legal Compliance:** Prioritize personal use. Use official CSV data feeds where possible to avoid scraping violations.
* **Throttling:** Implement delays between API requests to avoid IP bans.

## 5. Implementation Roadmap
1.  **Phase 1:** Build the FastAPI backend and test the eBay scraping logic.
2.  **Phase 2:** Fine-tune a YOLOv11 model on the CarDD dataset.
3.  **Phase 3:** Develop the Chrome extension to inject the "Calculate" button.
4.  **Phase 4:** Integrate the "Parts-to-Price" mapping logic.
