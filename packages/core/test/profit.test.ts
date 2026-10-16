import { describe, expect, it } from "vitest";
import { formatGBP, formatGBPShort } from "../src/format";
import { maxBidForProfit } from "../src/profit";

const COSTS = { arv: 3000, total_parts: 200, transport: 100, copart_fee_rate: 0.12 };

/** The backend's profit formula (backend/app/roi.py), for checking the inverse. */
function profitAt(bid: number): number {
  return COSTS.arv - (bid * (1 + COSTS.copart_fee_rate) + COSTS.total_parts + COSTS.transport);
}

describe("maxBidForProfit", () => {
  it("returns the highest whole-pound bid that still meets the target", () => {
    const bid = maxBidForProfit(COSTS, 500);

    expect(bid).toBe(1964);
    expect(profitAt(1964)).toBeGreaterThanOrEqual(500);
    expect(profitAt(1965)).toBeLessThan(500);
  });

  it("returns null when the target is out of reach", () => {
    expect(maxBidForProfit(COSTS, 5000)).toBeNull();
  });
});

describe("formatGBP", () => {
  it("formats pounds and pence", () => {
    expect(formatGBP(1234.5)).toBe("£1,234.50");
  });
});

describe("formatGBPShort", () => {
  it.each([
    [500, "£500"],
    [1000, "£1k"],
    [2500, "£2500"],
  ])("formats %d as %s", (amount, expected) => {
    expect(formatGBPShort(amount)).toBe(expected);
  });
});
