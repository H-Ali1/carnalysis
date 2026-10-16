import { describe, expect, it } from "vitest";
import { normalize, parseLotNumber, parseMoney, parseOdometer } from "../src/parse";

describe("parseMoney", () => {
  it.each([
    ["£3,450", 3450],
    ["GBP 3,450.50", 3450.5],
    ["Buy It Now £4,000", 4000],
  ])("parses %j", (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "No bids yet"])("returns null for %j", (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});

describe("parseOdometer", () => {
  it("strips separators and units", () => {
    expect(parseOdometer("127,029 mi (ACTUAL)")).toBe(127029);
  });

  it("returns null without digits", () => {
    expect(parseOdometer("EXEMPT")).toBeNull();
  });
});

describe("parseLotNumber", () => {
  it.each(["Lot number: 41861706", "LOT #41861706", "lot 41861706"])("finds it in %j", (raw) => {
    expect(parseLotNumber(raw)).toBe("41861706");
  });

  it("ignores numbers too short to be lot numbers", () => {
    expect(parseLotNumber("Lot 42")).toBeNull();
  });
});

describe("normalize", () => {
  it("collapses whitespace", () => {
    expect(normalize("  Primary \n\t damage  ")).toBe("Primary damage");
  });
});
