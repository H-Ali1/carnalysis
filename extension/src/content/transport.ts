// Transport cost estimation: user postcode + Copart yard → distance → cost.
//
// Distance: Haversine (straight-line) × 1.25 road factor → miles × £1.50/mile.
// Coordinates fetched from postcodes.io (free, no API key, CORS-enabled).
//
// Yard postcodes are approximate (yard entrance / nearest postcode centroid).
// Verify against https://www.copart.co.uk/content/locations if precision matters.

const RATE_PER_MILE = 1.5;
const ROAD_FACTOR = 1.25; // straight-line to road distance multiplier for UK

// Copart UK yard name (uppercased) → representative postcode
export const YARD_POSTCODES: Record<string, string> = {
  BEDFORD:          "MK44 3JL",
  BIRMINGHAM:       "B46 1DQ",
  BRISTOL:          "BS5 0SP",
  CORBY:            "NN17 5JZ",
  COVENTRY:         "CV7 8JE",
  CRAMLINGTON:      "NE23 1PN",
  EDINBURGH:        "EH16 4NS",
  EXETER:           "EX2 8QW",
  GLASGOW:          "G72 0UZ",
  LEEDS:            "LS26 8EJ",
  "LEIGHTON BUZZARD": "LU7 4TT",
  LONDON:           "RM16 3BL",
  MANCHESTER:       "M29 8SP",
  NOTTINGHAM:       "NG10 5LZ",
  PERTH:            "PH1 5EX",
  ROCHDALE:         "OL11 2YE",
  SANDWICH:         "CT13 9ND",
  SHEERNESS:        "ME12 3AD",
  WESTBURY:         "BA13 4JZ",
  WOLVERHAMPTON:    "WV1 4QR",
  YORK:             "YO26 6RB",
};

interface Coords { lat: number; lon: number }

async function fetchCoords(postcode: string): Promise<Coords | null> {
  try {
    const clean = postcode.replace(/\s+/g, "").toUpperCase();
    const resp = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    if (!resp.ok) return null;
    const data = await resp.json() as { result: { latitude: number; longitude: number } };
    return { lat: data.result.latitude, lon: data.result.longitude };
  } catch {
    return null;
  }
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lon - a.lon) * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
      Math.cos(b.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface TransportEstimate {
  miles: number;
  cost: number;
  yardPostcode: string;
}

export async function estimateTransport(
  userPostcode: string,
  yardName: string,
): Promise<TransportEstimate | null> {
  const yardKey = yardName.trim().toUpperCase();
  const yardPostcode = YARD_POSTCODES[yardKey];
  if (!yardPostcode) return null;

  const [userCoords, yardCoords] = await Promise.all([
    fetchCoords(userPostcode),
    fetchCoords(yardPostcode),
  ]);
  if (!userCoords || !yardCoords) return null;

  const km = haversineKm(userCoords, yardCoords);
  const miles = Math.round(km * 0.621371 * ROAD_FACTOR);
  const cost = Math.round(miles * RATE_PER_MILE);

  return { miles, cost, yardPostcode };
}

export function isValidUKPostcode(postcode: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim());
}
