// AutoTrader UK price lookup — called only from the background service worker.
//
// Strategy (in order):
//   1. AutoTrader internal search API (/at-gateway/motor/search) — clean JSON
//   2. HTML page with __NEXT_DATA__ extraction
//   3. Raw HTML regex fallback
// Falls back across strategies until prices are found.

export interface AutoTraderResult {
  median: number;
  low: number;
  high: number;
  count: number;
  searchUrl: string;
}

const MIN_LISTINGS = 3;
const MIN_PRICE = 500;
const MAX_PRICE = 300_000;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

export function buildSearchUrl(
  make: string,
  model: string,
  year: number,
  mileage?: number | null,
): string {
  const params = new URLSearchParams({
    "advertising-location": "at_cars",
    make: make.toUpperCase(),
    ...(model ? { model: model.toUpperCase() } : {}),
    "year-from": String(year - 1),
    "year-to": String(year + 1),
    sort: "relevance",
  });
  if (mileage && mileage > 0) {
    params.set("maximum-mileage", String(Math.round(mileage * 1.5)));
  }
  return `https://www.autotrader.co.uk/car-search?${params.toString()}`;
}

function isCarPrice(v: unknown): v is number {
  return typeof v === "number" && v >= MIN_PRICE && v <= MAX_PRICE;
}

// Recursively search a JSON tree for arrays of listing objects with price fields.
const PRICE_KEYS = ["price", "retailPrice", "advertisedPrice", "searchPrice", "amount", "value"];
const LISTING_KEYS = ["listings", "results", "adverts", "vehicles", "cars", "items"];

function extractFromJson(obj: unknown, depth = 0): number[] {
  if (depth > 14 || obj === null || typeof obj !== "object") return [];

  if (Array.isArray(obj)) {
    const prices: number[] = [];
    for (const item of obj) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        for (const key of PRICE_KEYS) {
          const val = (item as Record<string, unknown>)[key];
          if (isCarPrice(val)) { prices.push(val as number); break; }
          // price may be nested: { price: { amount: 16989 } }
          if (val && typeof val === "object") {
            for (const k2 of PRICE_KEYS) {
              const v2 = (val as Record<string, unknown>)[k2];
              if (isCarPrice(v2)) { prices.push(v2 as number); break; }
            }
          }
        }
      }
    }
    if (prices.length >= MIN_LISTINGS) return prices;
    for (const item of obj) {
      const found = extractFromJson(item, depth + 1);
      if (found.length >= MIN_LISTINGS) return found;
    }
    return [];
  }

  const record = obj as Record<string, unknown>;
  // Prioritise keys that sound like listing arrays.
  for (const key of LISTING_KEYS) {
    if (key in record) {
      const found = extractFromJson(record[key], depth + 1);
      if (found.length >= MIN_LISTINGS) return found;
    }
  }
  for (const value of Object.values(record)) {
    const found = extractFromJson(value, depth + 1);
    if (found.length >= MIN_LISTINGS) return found;
  }
  return [];
}

// Regex fallback: scrape £X,XXX patterns from raw HTML.
function extractFromHtml(html: string): number[] {
  const prices: number[] = [];
  for (const m of html.matchAll(/"price["\s]*:\s*"?(\d{3,6})"?/gi)) {
    const n = parseInt(m[1], 10);
    if (isCarPrice(n)) prices.push(n);
  }
  // Also match rendered £ strings
  for (const m of html.matchAll(/£\s?(\d{1,3}(?:,\d{3})+)/g)) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (isCarPrice(n)) prices.push(n);
  }
  return prices;
}

function summarise(prices: number[], searchUrl: string): AutoTraderResult {
  const sorted = [...prices].sort((a, b) => a - b);
  const trim = Math.max(0, Math.floor(sorted.length * 0.1));
  const trimmed = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  const mid = Math.floor(trimmed.length / 2);
  const median =
    trimmed.length % 2 !== 0
      ? trimmed[mid]
      : Math.round((trimmed[mid - 1] + trimmed[mid]) / 2);
  return {
    median,
    low: trimmed[0],
    high: trimmed[trimmed.length - 1],
    count: prices.length,
    searchUrl,
  };
}

async function tryFetchPage(url: string): Promise<{ status: number; html: string } | null> {
  try {
    const resp = await fetch(url, { headers: HEADERS });
    console.log("[carnalysis:autotrader] HTTP", resp.status, url);
    if (!resp.ok) return null;
    const html = await resp.text();
    console.log("[carnalysis:autotrader] response length", html.length, "has __NEXT_DATA__:", html.includes("__NEXT_DATA__"));
    return { status: resp.status, html };
  } catch (e) {
    console.error("[carnalysis:autotrader] fetch error", e);
    return null;
  }
}

function parsePage(html: string): number[] {
  // Strategy 1: __NEXT_DATA__
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]) as unknown;
      const prices = extractFromJson(data);
      console.log("[carnalysis:autotrader] __NEXT_DATA__ prices found:", prices.length);
      if (prices.length >= MIN_LISTINGS) return prices;
    } catch (e) {
      console.warn("[carnalysis:autotrader] __NEXT_DATA__ parse error", e);
    }
  }

  // Strategy 2: any JSON-like script tags
  for (const m of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]+?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]) as unknown;
      const prices = extractFromJson(data);
      if (prices.length >= MIN_LISTINGS) {
        console.log("[carnalysis:autotrader] JSON script prices found:", prices.length);
        return prices;
      }
    } catch { /* skip */ }
  }

  // Strategy 3: HTML regex
  const prices = extractFromHtml(html);
  console.log("[carnalysis:autotrader] regex prices found:", prices.length, prices.slice(0, 10));
  return prices;
}

export async function fetchAutoTraderPrices(
  make: string,
  model: string,
  year: number,
  mileage?: number | null,
): Promise<AutoTraderResult | null> {
  const searchUrl = buildSearchUrl(make, model, year, mileage);

  // Attempt 1: make + model + year (exact)
  let result = await tryFetchPage(searchUrl);
  if (result) {
    const prices = parsePage(result.html);
    if (prices.length >= MIN_LISTINGS) return summarise(prices, searchUrl);
  }

  // Attempt 2: make + year only (drop model — useful if AutoTrader uses different model names)
  const broaderUrl = buildSearchUrl(make, "", year, mileage);
  if (broaderUrl !== searchUrl) {
    console.log("[carnalysis:autotrader] retrying without model:", broaderUrl);
    result = await tryFetchPage(broaderUrl);
    if (result) {
      const prices = parsePage(result.html);
      if (prices.length >= MIN_LISTINGS) return summarise(prices, searchUrl);
    }
  }

  console.warn("[carnalysis:autotrader] no prices found after all strategies");
  return null;
}
