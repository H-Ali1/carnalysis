# Carnalysis backend

FastAPI service that turns a Copart lot's details into a profit and ROI estimate.

## Run

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload      # add --host 0.0.0.0 to serve the mobile app
```

OpenAPI docs: <http://localhost:8000/docs>.

## Configuration

Settings are read from the environment or `backend/.env` (see [`.env.example`](.env.example)).

| Variable | Default | Purpose |
| --- | --- | --- |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | unset | eBay Browse API keys. Without them, analyses exclude part prices and include a warning. |
| `CORS_ORIGINS` | `["*"]` | Origins allowed to call the API (JSON list). Restrict to `["https://www.copart.co.uk"]` in a shared deployment. |
| `DAMAGE_MODEL_PATH` | unset | Fine-tuned YOLO weights; enables automatic damage detection from photos. Needs `requirements-ml.txt`. |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/analyze` | Profit and ROI breakdown for a lot |

`/analyze` responds with:

- **200** with the breakdown. Anything incomplete, such as a part with no eBay price, is listed
  in `warnings`, and that part's `parts_cost` is `null`.
- **400** if the vehicle can't be identified from `lot_title` (and no `vehicle` is given), or
  if neither `damage_observations` nor `images` are supplied.
- **422** for invalid input (unknown panel, negative price, …), or if detection found no damage.
- **501** if `images` are sent but automatic damage detection isn't enabled.

## Layout

```text
app/
  main.py        app setup, dependency wiring, routes
  analysis.py    orchestration: vehicle → damage → part prices → ROI
  vehicle.py     lot-title parser (year, make, model)
  pricing.py     eBay part pricing, with a cached OAuth token
  roi.py         profit and ROI arithmetic
  panels.py      panel catalogue: eBay search terms, which damage needs a part
  damage.py      automatic damage detection (Phase 2, disabled by default)
  models.py      request and response schemas
  config.py      settings
tests/           pytest suite; external APIs are faked, so no network or keys are needed
```

## Checks

```bash
ruff check . && ruff format --check . && mypy && pytest
```
