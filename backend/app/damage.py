"""Automatic damage detection from lot photos (Phase 2 — needs fine-tuned weights).

A fine-tuned YOLO model is expected to emit class labels of the form
``panel:damage_type`` (e.g. ``front_bumper:crack``). Stock YOLO weights know nothing
about panels or damage, so detection stays disabled until ``DAMAGE_MODEL_PATH`` points
at a trained model; until then clients send ``damage_observations`` instead.
"""

import asyncio
import io
import logging
from collections.abc import Awaitable, Callable, Iterable, Sequence
from functools import lru_cache
from typing import Any

import httpx
from pydantic import ValidationError

from app.models import DamageObservation
from app.panels import DAMAGE_SEVERITY

logger = logging.getLogger(__name__)

# Inference dominates request latency; five photos cover a lot's damage in practice.
MAX_IMAGES = 5

DamageDetector = Callable[[Sequence[str]], Awaitable[list[DamageObservation]]]


class DamageDetectionUnavailableError(Exception):
    """Automatic detection isn't configured, or its ML dependencies aren't installed."""


async def detect_damage(
    image_urls: Sequence[str], *, model_path: str | None, http: httpx.AsyncClient
) -> list[DamageObservation]:
    """Run the damage model over a lot's photos and return one observation per panel."""
    if not model_path:
        raise DamageDetectionUnavailableError(
            "Automatic damage detection is not enabled yet; send damage_observations instead."
        )
    model = _load_model(model_path)

    images = await asyncio.gather(*(_fetch_image(http, url) for url in image_urls[:MAX_IMAGES]))
    labels: list[str] = []
    for image in images:
        if image is None:
            continue
        # Inference is CPU/GPU-bound; keep it off the event loop.
        results = await asyncio.to_thread(model, image, verbose=False)
        labels.extend(model.names[int(cls)] for result in results for cls in result.boxes.cls)
    return most_severe_per_panel(parse_labels(labels))


def parse_labels(labels: Iterable[str]) -> list[DamageObservation]:
    """Convert ``panel:damage_type`` model labels into observations, skipping unknown ones."""
    observations = []
    for label in labels:
        panel, _, damage_type = label.partition(":")
        try:
            obs = DamageObservation.model_validate({"panel": panel, "damage_type": damage_type})
        except ValidationError:
            logger.warning("Ignoring unrecognised model label %r", label)
            continue
        observations.append(obs)
    return observations


def most_severe_per_panel(observations: Iterable[DamageObservation]) -> list[DamageObservation]:
    """Collapse detections across photos so each panel is repaired (and priced) once."""
    worst: dict[str, DamageObservation] = {}
    for obs in observations:
        current = worst.get(obs.panel)
        if current is None or (
            DAMAGE_SEVERITY.index(obs.damage_type) < DAMAGE_SEVERITY.index(current.damage_type)
        ):
            worst[obs.panel] = obs
    return list(worst.values())


@lru_cache(maxsize=1)
def _load_model(model_path: str) -> Any:
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise DamageDetectionUnavailableError(
            "Automatic damage detection needs the ML extras: pip install -r requirements-ml.txt"
        ) from exc
    return YOLO(model_path)


async def _fetch_image(http: httpx.AsyncClient, url: str) -> Any | None:
    from PIL import Image  # installed with the ML extras

    try:
        response = await http.get(url)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    except (httpx.HTTPError, OSError) as exc:
        logger.warning("Skipping lot image %s: %s", url, exc)
        return None
