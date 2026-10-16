const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** 1234.5 → "£1,234.50". */
export function formatGBP(amount: number): string {
  return gbp.format(amount);
}

/** Whole-pound amounts for compact labels: 500 → "£500", 1000 → "£1k". */
export function formatGBPShort(amount: number): string {
  return amount >= 1000 && amount % 1000 === 0 ? `£${amount / 1000}k` : `£${amount}`;
}
