import asyncio

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

from damage import detect_damage
from ebay import search_part_price
from models import AnalyzeRequest, AnalyzeResponse, DamageObservation, PanelEstimate, Vehicle
from panel_config import REPAIR_STRATEGY
from roi import calculate_roi
from vehicle import parse_lot_title

load_dotenv()

app = FastAPI(title="Carnalysis — Copart Profit Estimator")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_lot(req: AnalyzeRequest):
    if req.damage_observations:
        observations = req.damage_observations
    elif req.images:
        raw = await detect_damage(req.images)
        if not raw:
            raise HTTPException(
                status_code=422,
                detail=(
                    "YOLO detected no panels. Provide damage_observations manually "
                    "until a fine-tuned model is integrated."
                ),
            )
        observations = [DamageObservation(**d) for d in raw]
    else:
        raise HTTPException(status_code=400, detail="Provide image URLs or damage_observations.")

    # Resolve vehicle identity: explicit vehicle wins, else parse the lot title.
    vehicle = req.vehicle
    if vehicle is None:
        parsed = parse_lot_title(req.lot_title) if req.lot_title else None
        if parsed is None:
            raise HTTPException(
                status_code=400,
                detail="Provide a vehicle object or a parseable lot_title.",
            )
        vehicle = Vehicle(**parsed)

    # Fetch eBay part prices only for observations that need replacement
    replacement_indices = {
        i: search_part_price(obs.panel, vehicle.make, vehicle.model, vehicle.year)
        for i, obs in enumerate(observations)
        if REPAIR_STRATEGY.get(obs.damage_type, {}).get("parts_needed", False)
    }
    fetched_prices = await asyncio.gather(*replacement_indices.values())
    prices_by_index = dict(zip(replacement_indices.keys(), fetched_prices))

    panel_estimates = []
    total_parts = 0.0
    total_labor = 0.0

    for i, obs in enumerate(observations):
        strategy = REPAIR_STRATEGY.get(obs.damage_type, REPAIR_STRATEGY["scratch"])
        parts_cost = float(prices_by_index.get(i) or 0.0) if strategy["parts_needed"] else 0.0
        labor_cost = float(strategy["labor_gbp"])
        total_parts += parts_cost
        total_labor += labor_cost
        panel_estimates.append(
            PanelEstimate(
                panel=obs.panel,
                damage_type=obs.damage_type,
                parts_cost=parts_cost,
                labor_cost=labor_cost,
                total=parts_cost + labor_cost,
            )
        )

    result = calculate_roi(
        hammer_price=req.hammer_price,
        arv=req.arv,
        total_parts=total_parts,
        total_labor=total_labor,
    )

    return AnalyzeResponse(observations=panel_estimates, **result)
