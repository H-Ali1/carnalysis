import httpx
import os
import time
from typing import Optional

from panel_config import PANEL_SEARCH_TERMS

EBAY_AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"

_token_cache: dict = {"token": None, "expires_at": 0.0}


async def _get_access_token() -> str:
    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            EBAY_AUTH_URL,
            auth=(os.environ["EBAY_CLIENT_ID"], os.environ["EBAY_CLIENT_SECRET"]),
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        data = resp.json()

    _token_cache["token"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + data["expires_in"] - 60
    return _token_cache["token"]


async def search_part_price(panel: str, make: str, model: str, year: int) -> Optional[float]:
    search_term = PANEL_SEARCH_TERMS.get(panel, panel.replace("_", " "))
    query = f"{year} {make} {model} {search_term}"

    try:
        token = await _get_access_token()
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                EBAY_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
                },
                params={
                    "q": query,
                    "filter": "itemLocationCountry:GB,conditions:{USED}",
                    "limit": 10,
                    "sort": "price",
                },
            )
            resp.raise_for_status()
            items = resp.json().get("itemSummaries", [])
    except Exception:
        return None

    prices = sorted(
        float(item["price"]["value"])
        for item in items
        if "price" in item
    )
    if not prices:
        return None
    return prices[len(prices) // 2]  # median price
