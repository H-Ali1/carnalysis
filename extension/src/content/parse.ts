// Processing layer: pure functions that turn raw scraped strings into clean values.
// Kept separate from extract.ts (DOM access) so they are trivially unit-testable.

/** Parse a Copart money string like "£3,450" or "GBP 3,450.00" into a number. */
export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  // Keep the first number group only, so "Buy It Now £4,000" -> 4000.
  const match = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Parse an odometer reading like "127,029" or "127,029 mi" into an integer. */
export function parseOdometer(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** Pull the lot number out of text like "Lot number: 41861706". */
export function parseLotNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/lot\s*(?:number|#)?\s*[:#]?\s*(\d{6,})/i);
  return match ? match[1] : null;
}

/** Collapse whitespace and trim. */
export function normalize(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}
