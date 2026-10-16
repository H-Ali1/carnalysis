from app.models import Panel, Vehicle


class FakePricer:
    """In-memory PartPricer: returns canned prices and records what it was asked for."""

    def __init__(
        self, prices: dict[str, float | None] | None = None, error: Exception | None = None
    ) -> None:
        self.prices = prices or {}
        self.error = error
        self.calls: list[tuple[Panel, Vehicle]] = []

    async def price(self, panel: Panel, vehicle: Vehicle) -> float | None:
        self.calls.append((panel, vehicle))
        if self.error is not None:
            raise self.error
        return self.prices.get(panel)
