"""Request and response schemas for the HTTP API.

The TypeScript mirror of these types lives in ``packages/core/src/types.ts``.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

DamageType = Literal["scratch", "scuff", "dent", "crack", "missing"]

# "os" / "ns" are the UK offside (driver) and nearside (passenger) conventions.
Panel = Literal[
    "front_bumper",
    "rear_bumper",
    "bonnet",
    "tailgate",
    "roof",
    "front_wing_os",
    "front_wing_ns",
    "door_front_os",
    "door_front_ns",
    "door_rear_os",
    "door_rear_ns",
    "rear_quarter_os",
    "rear_quarter_ns",
    "headlight_os",
    "headlight_ns",
    "taillight_os",
    "taillight_ns",
]


class Vehicle(BaseModel):
    make: str = Field(examples=["Volkswagen"])
    model: str = Field(examples=["Polo"])
    year: int = Field(ge=1950, le=2100, examples=[2017])


class DamageObservation(BaseModel):
    panel: Panel
    damage_type: DamageType


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "lot_title": "2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR",
                    "damage_observations": [
                        {"panel": "front_bumper", "damage_type": "crack"},
                        {"panel": "bonnet", "damage_type": "dent"},
                    ],
                    "hammer_price": 1200,
                    "arv": 4500,
                    "transport": 95,
                }
            ]
        }
    )

    lot_title: str = Field(
        default="",
        description="Raw Copart lot title, parsed into a vehicle when `vehicle` is omitted.",
    )
    vehicle: Vehicle | None = Field(
        default=None, description="Explicit vehicle identity; takes precedence over `lot_title`."
    )
    damage_observations: list[DamageObservation] = Field(
        default_factory=list,
        description="Damaged panels. Required until automatic detection is enabled.",
    )
    images: list[HttpUrl] = Field(
        default_factory=list,
        max_length=14,
        description="Lot photo URLs, used for automatic damage detection when no observations "
        "are given.",
    )
    hammer_price: float = Field(ge=0, description="Expected winning bid in GBP.")
    arv: float = Field(ge=0, description="After-repair (retail) value in GBP.")
    transport: float | None = Field(
        default=None,
        ge=0,
        description="Transport cost in GBP. A flat-rate estimate is used when omitted.",
    )


class PanelEstimate(BaseModel):
    panel: Panel
    damage_type: DamageType
    part_required: bool = Field(
        description="Whether the damage needs a replacement part rather than a repair."
    )
    parts_cost: float | None = Field(
        description="Median used-part price in GBP. Null when a part is needed but no price "
        "was found; zero for repair-only damage."
    )


class AnalyzeResponse(BaseModel):
    vehicle: Vehicle
    observations: list[PanelEstimate]
    hammer_price: float
    copart_fee_rate: float
    copart_fees: float
    total_parts: float
    transport: float
    total_cost: float
    arv: float
    profit_estimate: float
    roi_percent: float
    warnings: list[str] = Field(
        default_factory=list,
        description="Anything that makes the estimate less complete, e.g. parts without a price.",
    )
