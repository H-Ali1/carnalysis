// Pure helpers that turn raw strings scraped from a lot page into clean values.

/** Collapse runs of whitespace and trim. */
export function normalize(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

/** "£3,450" or "GBP 3,450.00" → 3450. Takes the first number, so "Buy It Now £4,000" → 4000. */
export function parseMoney(raw: string | null | undefined): number | null {
  const match = raw?.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** "127,029 mi" → 127029. */
export function parseOdometer(raw: string | null | undefined): number | null {
  const digits = raw?.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** "Lot number: 41861706" → "41861706". */
export function parseLotNumber(raw: string | null | undefined): string | null {
  return raw?.match(/lot\s*(?:number|#)?\s*[:#]?\s*(\d{6,})/i)?.[1] ?? null;
}
