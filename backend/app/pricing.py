"""Used-part pricing via the eBay Browse API."""

import asyncio
import logging
import statistics
import time
from typing import Any, Protocol

import httpx

from app.models import Panel, Vehicle
from app.panels import PART_SEARCH

logger = logging.getLogger(__name__)

EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
_EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"
_USED_CONDITION_ID = 3000
_LISTINGS_PER_SEARCH = 10
_TOKEN_REFRESH_MARGIN_S = 60


class PricingUnavailableError(Exception):
    """No part can be priced at all, e.g. because credentials are missing or rejected."""


class PartPricer(Protocol):
    async def price(self, panel: Panel, vehicle: Vehicle) -> float | None:
        """Return a representative used-part price in GBP, or ``None`` if none was found."""
        ...


class UnconfiguredPricer:
    """Stand-in pricer for when no eBay credentials are configured."""

    async def price(self, panel: Panel, vehicle: Vehicle) -> float | None:
        raise PricingUnavailableError(
            "Part prices unavailable: eBay API credentials are not configured."
        )


class EbayPartPricer:
    """Prices a part as the median of the top used, UK-located eBay listings for it."""

    def __init__(self, http: httpx.AsyncClient, client_id: str, client_secret: str) -> None:
        self._http = http
        self._credentials = (client_id, client_secret)
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._token_lock = asyncio.Lock()

    async def price(self, panel: Panel, vehicle: Vehicle) -> float | None:
        search = PART_SEARCH[panel]
        query = f"{vehicle.year} {vehicle.make} {vehicle.model} {search.term}"
        token = await self._access_token()
        try:
            response = await self._http.get(
                EBAY_SEARCH_URL,
                headers={"Authorization": f"Bearer {token}", "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB"},
                params={
                    "q": query,
                    "filter": (
                        f"itemLocationCountry:GB,conditions:{{{_USED_CONDITION_ID}}},"
                        f"price:[{search.min_price}..],priceCurrency:GBP"
                    ),
                    "limit": _LISTINGS_PER_SEARCH,
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("eBay search failed for %r: %s", query, exc)
            return None

        prices = _listing_prices(response.json())
        logger.info("eBay %r: %d priced listings", query, len(prices))
        return statistics.median(prices) if prices else None

    async def _access_token(self) -> str:
        """Return a cached OAuth application token, refreshing it shortly before expiry.

        The lock stops concurrent lookups from each requesting their own token.
        """
        async with self._token_lock:
            if self._token is not None and time.monotonic() < self._token_expires_at:
                return self._token
            try:
                response = await self._http.post(
                    EBAY_TOKEN_URL,
                    auth=self._credentials,
                    data={"grant_type": "client_credentials", "scope": _EBAY_SCOPE},
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                logger.error("eBay authentication failed: %s", exc)
                raise PricingUnavailableError(
                    "Part prices unavailable: eBay rejected the API credentials."
                ) from exc

            payload = response.json()
            token: str = payload["access_token"]
            self._token = token
            self._token_expires_at = (
                time.monotonic() + payload["expires_in"] - _TOKEN_REFRESH_MARGIN_S
            )
            return token


def _listing_prices(payload: dict[str, Any]) -> list[float]:
    prices = []
    for item in payload.get("itemSummaries", []):
        try:
            prices.append(float(item["price"]["value"]))
        except (KeyError, TypeError, ValueError):
            continue  # listing without a usable price
    return prices
