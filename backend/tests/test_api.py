from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.pricing import PricingUnavailableError
from tests.fakes import FakePricer

POLO_TITLE = "2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR"


def analyze_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "lot_title": POLO_TITLE,
        "damage_observations": [
            {"panel": "front_bumper", "damage_type": "crack"},
            {"panel": "bonnet", "damage_type": "dent"},
        ],
        "hammer_price": 1000,
        "arv": 3000,
        "transport": 100,
    }
    return payload | overrides


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_analyze_returns_full_breakdown(client: TestClient, pricer: FakePricer) -> None:
    response = client.post("/analyze", json=analyze_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["vehicle"] == {"make": "Volkswagen", "model": "Polo", "year": 2017}
    assert body["observations"] == [
        {
            "panel": "front_bumper",
            "damage_type": "crack",
            "part_required": True,
            "parts_cost": 120.0,
        },
        {"panel": "bonnet", "damage_type": "dent", "part_required": False, "parts_cost": 0.0},
    ]
    assert body["total_parts"] == 120.0
    assert body["copart_fees"] == 120.0
    assert body["total_cost"] == 1340.0
    assert body["profit_estimate"] == 1660.0
    assert body["warnings"] == []
    # Only damage that needs a replacement part is priced.
    assert [panel for panel, _ in pricer.calls] == ["front_bumper"]


def test_explicit_vehicle_takes_precedence_over_title(
    client: TestClient, pricer: FakePricer
) -> None:
    vehicle = {"make": "Ford", "model": "Fiesta", "year": 2019}

    response = client.post("/analyze", json=analyze_payload(vehicle=vehicle))

    assert response.json()["vehicle"] == vehicle
    assert pricer.calls[0][1].model == "Fiesta"


def test_unpriced_parts_are_flagged_not_silently_zeroed(client: TestClient) -> None:
    damage = [{"panel": "rear_bumper", "damage_type": "missing"}]

    body = client.post("/analyze", json=analyze_payload(damage_observations=damage)).json()

    assert body["observations"][0]["parts_cost"] is None
    assert body["total_parts"] == 0.0
    assert body["warnings"] == ["No eBay price found for 1 part; excluded from the parts total."]


def test_analysis_still_succeeds_when_pricing_is_unavailable(
    client: TestClient, pricer: FakePricer
) -> None:
    pricer.error = PricingUnavailableError("Part prices unavailable: test.")

    response = client.post("/analyze", json=analyze_payload())

    assert response.status_code == 200
    assert response.json()["warnings"] == ["Part prices unavailable: test."]


def test_transport_defaults_to_flat_rate(client: TestClient) -> None:
    payload = analyze_payload()
    del payload["transport"]

    assert client.post("/analyze", json=payload).json()["transport"] == 150.0


@pytest.mark.parametrize(
    ("overrides", "status"),
    [
        ({"lot_title": "NOT A REAL TITLE"}, 400),
        ({"damage_observations": []}, 400),
        ({"damage_observations": [], "images": ["https://cs.copart.co.uk/1.jpg"]}, 501),
        ({"damage_observations": [{"panel": "spoiler", "damage_type": "dent"}]}, 422),
        ({"hammer_price": -5}, 422),
    ],
)
def test_rejects_invalid_requests(
    client: TestClient, overrides: dict[str, Any], status: int
) -> None:
    response = client.post("/analyze", json=analyze_payload(**overrides))

    assert response.status_code == status
    assert response.json()["detail"]
