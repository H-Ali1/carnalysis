from collections.abc import Callable

import httpx
import pytest

from app.models import Vehicle
from app.pricing import (
    EBAY_SEARCH_URL,
    EBAY_TOKEN_URL,
    EbayPartPricer,
    PricingUnavailableError,
    UnconfiguredPricer,
)

POLO = Vehicle(make="Volkswagen", model="Polo", year=2017)

pytestmark = pytest.mark.anyio


def ebay_stub(
    listing_prices: list[str], *, auth_status: int = 200, search_status: int = 200
) -> tuple[Callable[[httpx.Request], httpx.Response], list[httpx.Request]]:
    """A fake eBay API that records every request it receives."""
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        url = str(request.url)
        if url.startswith(EBAY_TOKEN_URL):
            return httpx.Response(auth_status, json={"access_token": "tkn", "expires_in": 7200})
        if url.startswith(EBAY_SEARCH_URL):
            summaries = [{"price": {"value": p, "currency": "GBP"}} for p in listing_prices]
            return httpx.Response(search_status, json={"itemSummaries": summaries})
        return httpx.Response(404)

    return handler, requests


def make_pricer(handler: Callable[[httpx.Request], httpx.Response]) -> EbayPartPricer:
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return EbayPartPricer(http, "client-id", "client-secret")


async def test_returns_median_listing_price() -> None:
    handler, requests = ebay_stub(["100.00", "40.00", "250.00", "80.00"])

    price = await make_pricer(handler).price("front_bumper", POLO)

    assert price == pytest.approx(90.0)
    search = requests[-1]
    assert search.url.params["q"] == "2017 Volkswagen Polo front bumper complete"
    assert "price:[30..]" in search.url.params["filter"]
    assert search.headers["X-EBAY-C-MARKETPLACE-ID"] == "EBAY_GB"


async def test_reuses_the_access_token_across_lookups() -> None:
    handler, requests = ebay_stub(["50.00"])
    pricer = make_pricer(handler)

    await pricer.price("bonnet", POLO)
    await pricer.price("roof", POLO)

    token_requests = [r for r in requests if str(r.url).startswith(EBAY_TOKEN_URL)]
    assert len(token_requests) == 1


async def test_returns_none_when_no_listings_match() -> None:
    handler, _ = ebay_stub([])

    assert await make_pricer(handler).price("bonnet", POLO) is None


async def test_returns_none_when_search_fails() -> None:
    handler, _ = ebay_stub(["50.00"], search_status=503)

    assert await make_pricer(handler).price("bonnet", POLO) is None


async def test_rejected_credentials_make_pricing_unavailable() -> None:
    handler, _ = ebay_stub(["50.00"], auth_status=401)

    with pytest.raises(PricingUnavailableError, match="rejected"):
        await make_pricer(handler).price("bonnet", POLO)


async def test_unconfigured_pricer_explains_why() -> None:
    with pytest.raises(PricingUnavailableError, match="not configured"):
        await UnconfiguredPricer().price("bonnet", POLO)
