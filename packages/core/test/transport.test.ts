import { afterEach, describe, expect, it, vi } from "vitest";
import { haversineKm, isValidUKPostcode, quoteTransport } from "../src/transport";

const LEEDS_CITY = { lat: 53.7997, lon: -1.5492 };
const YORK_YARD = { lat: 53.9719, lon: -1.1405 };

/** Fakes postcodes.io for the given postcodes (keyed without spaces); others 404. */
function stubPostcodesApi(known: Record<string, { lat: number; lon: number }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const coords = known[decodeURIComponent(url.split("/").at(-1) ?? "")];
    return coords
      ? Response.json({ result: { latitude: coords.lat, longitude: coords.lon } })
      : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isValidUKPostcode", () => {
  it.each(["LS1 1BA", "ls11ba", "SW1A 1AA", "M1 1AE", "DN55 1PT"])("accepts %j", (postcode) => {
    expect(isValidUKPostcode(postcode)).toBe(true);
  });

  it.each(["", "12345", "LS1", "LS1 1B", "LS1 1BAA"])("rejects %j", (postcode) => {
    expect(isValidUKPostcode(postcode)).toBe(false);
  });
});

describe("haversineKm", () => {
  it("matches the known London to Manchester distance", () => {
    const km = haversineKm({ lat: 51.5074, lon: -0.1278 }, { lat: 53.4808, lon: -2.2426 });

    expect(km).toBeGreaterThan(255);
    expect(km).toBeLessThan(270);
  });
});

describe("quoteTransport", () => {
  it("quotes by road distance from the user to the yard", async () => {
    const fetchMock = stubPostcodesApi({ LS11BA: LEEDS_CITY, YO266RB: YORK_YARD });

    const quote = await quoteTransport("LS1 1BA", "York");

    expect(quote.kind).toBe("distance");
    if (quote.kind !== "distance") return;
    expect(quote.miles).toBeGreaterThan(20);
    expect(quote.miles).toBeLessThan(40);
    expect(quote.cost).toBe(Math.round(quote.miles * 1.5));
    expect(quote.yardPostcode).toBe("YO26 6RB");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.postcodes.io/postcodes/LS11BA",
      expect.anything(),
    );
  });

  it.each([
    { postcode: "LS1 1BA", yard: null, severity: "info", reason: /no yard/i },
    { postcode: "LS1 1BA", yard: "ATLANTIS", severity: "warning", reason: /isn't mapped/ },
    { postcode: "not a postcode", yard: "York", severity: "info", reason: /enter your postcode/i },
  ])("falls back to the flat rate: $reason", async ({ postcode, yard, severity, reason }) => {
    const fetchMock = stubPostcodesApi({});

    const quote = await quoteTransport(postcode, yard);

    expect(quote).toMatchObject({ kind: "flat", severity, reason: expect.stringMatching(reason) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the flat rate when the postcode lookup fails", async () => {
    stubPostcodesApi({ YO266RB: YORK_YARD });

    const quote = await quoteTransport("ZZ9 9ZZ", "York");

    expect(quote).toMatchObject({ kind: "flat", severity: "warning" });
  });
});
