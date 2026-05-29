from pydantic import BaseModel
from typing import List, Literal

DamageType = Literal["scratch", "scuff", "dent", "crack", "missing"]


class Vehicle(BaseModel):
    make: str
    model: str
    year: int


class DamageObservation(BaseModel):
    panel: str
    damage_type: DamageType


class AnalyzeRequest(BaseModel):
    lot_title: str = ""                                # raw Copart title — parsed into vehicle if vehicle omitted
    vehicle: Vehicle | None = None
    damage_observations: List[DamageObservation] = []
    images: List[str] = []                             # Copart lot image URLs (YOLO path)
    hammer_price: float
    arv: float


class PanelEstimate(BaseModel):
    panel: str
    damage_type: str
    parts_cost: float
    labor_cost: float
    total: float


class AnalyzeResponse(BaseModel):
    observations: List[PanelEstimate]
    hammer_price: float
    copart_fees: float
    total_parts: float
    total_labor: float
    transport: float
    total_cost: float
    arv: float
    profit_estimate: float
    roi_percent: float
