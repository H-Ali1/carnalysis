import httpx
import pytest

from app.damage import (
    DamageDetectionUnavailableError,
    detect_damage,
    most_severe_per_panel,
    parse_labels,
)
from app.models import DamageObservation


def test_parses_panel_damage_labels_and_skips_unknown_ones() -> None:
    observations = parse_labels(["front_bumper:crack", "spoiler:dent", "person", "bonnet:dent"])

    assert observations == [
        DamageObservation(panel="front_bumper", damage_type="crack"),
        DamageObservation(panel="bonnet", damage_type="dent"),
    ]


def test_keeps_only_the_most_severe_damage_per_panel() -> None:
    observations = [
        DamageObservation(panel="front_bumper", damage_type="scratch"),
        DamageObservation(panel="front_bumper", damage_type="crack"),
        DamageObservation(panel="bonnet", damage_type="dent"),
        DamageObservation(panel="front_bumper", damage_type="dent"),
    ]

    assert most_severe_per_panel(observations) == [
        DamageObservation(panel="front_bumper", damage_type="crack"),
        DamageObservation(panel="bonnet", damage_type="dent"),
    ]


@pytest.mark.anyio
async def test_detection_is_unavailable_without_a_model() -> None:
    async with httpx.AsyncClient() as http:
        with pytest.raises(DamageDetectionUnavailableError):
            await detect_damage(["https://example.com/1.jpg"], model_path=None, http=http)
