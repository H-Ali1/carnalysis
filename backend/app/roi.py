"""Profit and ROI arithmetic."""

from dataclasses import dataclass

COPART_FEE_RATE = 0.12
"""Approximate Copart UK buyer's fee, as a fraction of the hammer price."""

DEFAULT_TRANSPORT_GBP = 150.0
"""Flat-rate transport estimate, used when the client doesn't send a distance-based quote."""


@dataclass(frozen=True, slots=True)
class RoiBreakdown:
    hammer_price: float
    copart_fee_rate: float
    copart_fees: float
    total_parts: float
    transport: float
    total_cost: float
    arv: float
    profit_estimate: float
    roi_percent: float


def calculate_roi(
    *, hammer_price: float, arv: float, total_parts: float, transport: float | None = None
) -> RoiBreakdown:
    """Break down the cost of buying, repairing and reselling a lot.

    ``profit = arv - (hammer_price + copart_fees + total_parts + transport)``, and ROI is
    profit as a percentage of total cost.
    """
    transport_cost = DEFAULT_TRANSPORT_GBP if transport is None else transport
    copart_fees = round(hammer_price * COPART_FEE_RATE, 2)
    total_cost = round(hammer_price + copart_fees + total_parts + transport_cost, 2)
    profit = round(arv - total_cost, 2)
    roi_percent = round(profit / total_cost * 100, 1) if total_cost > 0 else 0.0

    return RoiBreakdown(
        hammer_price=hammer_price,
        copart_fee_rate=COPART_FEE_RATE,
        copart_fees=copart_fees,
        total_parts=round(total_parts, 2),
        transport=round(transport_cost, 2),
        total_cost=total_cost,
        arv=arv,
        profit_estimate=profit,
        roi_percent=roi_percent,
    )
