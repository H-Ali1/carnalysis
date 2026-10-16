import type { AnalyzeResponse } from "./types";

/** Profit targets offered as one-tap "max bid" shortcuts in both clients. */
export const PROFIT_TARGETS_GBP = [500, 1000] as const;

type CostBasis = Pick<AnalyzeResponse, "arv" | "total_parts" | "transport" | "copart_fee_rate">;

/**
 * The highest hammer price that still leaves `targetProfit`, keeping every other cost
 * from an analysis fixed. Solves
 * `arv - (bid × (1 + feeRate) + parts + transport) = targetProfit` for `bid`.
 * Returns null when the target can't be reached at any price.
 */
export function maxBidForProfit(costs: CostBasis, targetProfit: number): number | null {
  const bid =
    (costs.arv - costs.total_parts - costs.transport - targetProfit) / (1 + costs.copart_fee_rate);
  return bid > 0 ? Math.floor(bid) : null;
}
