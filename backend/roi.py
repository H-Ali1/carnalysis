from panel_config import COPART_FEE_RATE, TRANSPORT_GBP


def calculate_roi(
    hammer_price: float,
    arv: float,
    total_parts: float,
    total_labor: float,
) -> dict:
    copart_fees = round(hammer_price * COPART_FEE_RATE, 2)
    total_cost = round(hammer_price + copart_fees + total_parts + total_labor + TRANSPORT_GBP, 2)
    profit = round(arv - total_cost, 2)
    roi_percent = round((profit / total_cost * 100) if total_cost > 0 else 0.0, 1)

    return {
        "hammer_price": hammer_price,
        "copart_fees": copart_fees,
        "total_parts": round(total_parts, 2),
        "total_labor": round(total_labor, 2),
        "transport": float(TRANSPORT_GBP),
        "total_cost": total_cost,
        "arv": arv,
        "profit_estimate": profit,
        "roi_percent": roi_percent,
    }
