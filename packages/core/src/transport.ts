// Transport quote: the user's postcode and the lot's Copart yard → road miles → cost.
//
// Distance is the great-circle distance between postcode centroids (from postcodes.io,
// free and keyless) scaled by a typical UK road-to-straight-line ratio. Yard postcodes
// are approximate; see https://www.copart.co.uk/content/locations.

const POSTCODES_API = "https://api.postcodes.io/postcodes";
const RATE_PER_MILE_GBP = 1.5;
const ROAD_DISTANCE_FACTOR = 1.25;
const EARTH_RADIUS_KM = 6371;
const KM_TO_MILES = 0.621371;

/** Copart UK yard name (upper case, as shown on lot pages) → representative postcode. */
export const YARD_POSTCODES: Readonly<Record<string, string>> = {
  BEDFORD: "MK44 3JL",
  BIRMINGHAM: "B46 1DQ",
  BRISTOL: "BS5 0SP",
  CORBY: "NN17 5JZ",
  COVENTRY: "CV7 8JE",
  CRAMLINGTON: "NE23 1PN",
  EDINBURGH: "EH16 4NS",
  EXETER: "EX2 8QW",
  GLASGOW: "G72 0UZ",
  LEEDS: "LS26 8EJ",
  "LEIGHTON BUZZARD": "LU7 4TT",
  LONDON: "RM16 3BL",
  MANCHESTER: "M29 8SP",
  NOTTINGHAM: "NG10 5LZ",
  PERTH: "PH1 5EX",
  ROCHDALE: "OL11 2YE",
  SANDWICH: "CT13 9ND",
  SHEERNESS: "ME12 3AD",
  WESTBURY: "BA13 4JZ",
  WOLVERHAMPTON: "WV1 4QR",
  YORK: "YO26 6RB",
};

export type TransportQuote =
  | { kind: "distance"; miles: number; cost: number; yardPostcode: string }
  /** No distance-based quote is possible; the server's flat-rate estimate applies. */
  | { kind: "flat"; reason: string; severity: "info" | "warning" };

export interface Coordinates {
  lat: number;
  lon: number;
}

export function isValidUKPostcode(postcode: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim());
}

export async function quoteTransport(
  userPostcode: string,
  yardName: string | null,
  signal?: AbortSignal,
): Promise<TransportQuote> {
  if (!yardName) {
    return { kind: "flat", reason: "No yard found on the lot page.", severity: "info" };
  }
  const yardPostcode = YARD_POSTCODES[yardName.trim().toUpperCase()];
  if (!yardPostcode) {
    return { kind: "flat", reason: `Yard "${yardName}" isn't mapped yet.`, severity: "warning" };
  }
  if (!isValidUKPostcode(userPostcode)) {
    return {
      kind: "flat",
      reason: "Enter your postcode for a distance-based quote.",
      severity: "info",
    };
  }

  const [from, to] = await Promise.all([
    lookupCoordinates(userPostcode, signal),
    lookupCoordinates(yardPostcode, signal),
  ]);
  if (!from || !to) {
    return {
      kind: "flat",
      reason: "Postcode lookup failed — check your postcode.",
      severity: "warning",
    };
  }

  const miles = Math.round(haversineKm(from, to) * KM_TO_MILES * ROAD_DISTANCE_FACTOR);
  return { kind: "distance", miles, cost: Math.round(miles * RATE_PER_MILE_GBP), yardPostcode };
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function lookupCoordinates(
  postcode: string,
  signal?: AbortSignal,
): Promise<Coordinates | null> {
  try {
    const compact = postcode.replace(/\s+/g, "").toUpperCase();
    const response = await fetch(`${POSTCODES_API}/${encodeURIComponent(compact)}`, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as { result: { latitude: number; longitude: number } };
    return { lat: body.result.latitude, lon: body.result.longitude };
  } catch {
    return null;
  }
}
