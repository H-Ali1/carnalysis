"""Lot analysis: resolve the vehicle and damage, price parts, and compute ROI."""

import asyncio
from collections.abc import Sequence
from dataclasses import asdict

from app.damage import DamageDetector
from app.models import AnalyzeRequest, AnalyzeResponse, DamageObservation, PanelEstimate, Vehicle
from app.panels import PART_REQUIRED
from app.pricing import PartPricer, PricingUnavailableError
from app.roi import calculate_roi
from app.vehicle import parse_lot_title


class AnalysisError(Exception):
    """The request can't be analysed as given; carries the HTTP status to report."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


async def analyze_lot(
    request: AnalyzeRequest, *, pricer: PartPricer, detect_damage: DamageDetector
) -> AnalyzeResponse:
    vehicle = resolve_vehicle(request)
    observations = await _resolve_damage(request, detect_damage)
    prices, warnings = await _price_parts(observations, vehicle, pricer)

    breakdown = calculate_roi(
        hammer_price=request.hammer_price,
        arv=request.arv,
        total_parts=sum(price for price in prices if price is not None),
        transport=request.transport,
    )
    estimates = [
        PanelEstimate(
            panel=obs.panel,
            damage_type=obs.damage_type,
            part_required=PART_REQUIRED[obs.damage_type],
            parts_cost=price,
        )
        for obs, price in zip(observations, prices, strict=True)
    ]
    return AnalyzeResponse(
        vehicle=vehicle, observations=estimates, warnings=warnings, **asdict(breakdown)
    )


def resolve_vehicle(request: AnalyzeRequest) -> Vehicle:
    """Use the explicit vehicle if given, otherwise parse it from the lot title."""
    if request.vehicle is not None:
        return request.vehicle
    vehicle = parse_lot_title(request.lot_title)
    if vehicle is None:
        raise AnalysisError(
            "Could not identify the vehicle. Send `vehicle`, or a `lot_title` that starts "
            "with the year and make, e.g. '2017 VOLKSWAGEN POLO 1.0'."
        )
    return vehicle


async def _resolve_damage(
    request: AnalyzeRequest, detect_damage: DamageDetector
) -> list[DamageObservation]:
    if request.damage_observations:
        return request.damage_observations
    if not request.images:
        raise AnalysisError("Send damage_observations, or images for automatic detection.")

    observations = await detect_damage([str(url) for url in request.images])
    if not observations:
        raise AnalysisError(
            "No damage was detected in the photos; send damage_observations instead.",
            status_code=422,
        )
    return observations


async def _price_parts(
    observations: Sequence[DamageObservation], vehicle: Vehicle, pricer: PartPricer
) -> tuple[list[float | None], list[str]]:
    """Price each observation that needs a replacement part.

    Returns one price per observation — ``0.0`` for repair-only damage and ``None`` when
    no price could be found — plus user-facing warnings about anything left out.
    """
    needs_part = [i for i, obs in enumerate(observations) if PART_REQUIRED[obs.damage_type]]
    tasks: dict[int, asyncio.Task[float | None]] = {}
    unavailable: str | None = None
    try:
        # A TaskGroup cancels the remaining lookups as soon as one shows that pricing is
        # unavailable altogether, rather than letting each of them fail in turn.
        async with asyncio.TaskGroup() as group:
            for i in needs_part:
                tasks[i] = group.create_task(pricer.price(observations[i].panel, vehicle))
    except* PricingUnavailableError as errors:
        unavailable = str(errors.exceptions[0])

    prices: list[float | None] = [0.0] * len(observations)
    if unavailable is not None:
        for i in needs_part:
            prices[i] = None
        return prices, [unavailable]

    for i, task in tasks.items():
        prices[i] = task.result()
    unpriced = sum(price is None for price in prices)
    if not unpriced:
        return prices, []
    noun = "part" if unpriced == 1 else "parts"
    return prices, [f"No eBay price found for {unpriced} {noun}; excluded from the parts total."]
