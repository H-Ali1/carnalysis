// Wire types for the backend API — keep in sync with backend/app/models.py.

import type { DamageType, Panel } from "./panels";

export interface Vehicle {
  make: string;
  model: string;
  year: number;
}

export interface DamageObservation {
  panel: Panel;
  damage_type: DamageType;
}

export interface AnalyzeRequest {
  lot_title: string;
  vehicle?: Vehicle;
  damage_observations: DamageObservation[];
  images?: string[];
  hammer_price: number;
  arv: number;
  /** Omit to let the server apply its flat-rate estimate. */
  transport?: number;
}

export interface PanelEstimate {
  panel: Panel;
  damage_type: DamageType;
  part_required: boolean;
  /** Null when a part is needed but no price was found; zero for repair-only damage. */
  parts_cost: number | null;
}

export interface AnalyzeResponse {
  vehicle: Vehicle;
  observations: PanelEstimate[];
  hammer_price: number;
  copart_fee_rate: number;
  copart_fees: number;
  total_parts: number;
  transport: number;
  total_cost: number;
  arv: number;
  profit_estimate: number;
  roi_percent: number;
  warnings: string[];
}

/** Fields read from a Copart lot page; anything not found on the page is null. */
export interface LotData {
  lotTitle: string;
  lotNumber: string | null;
  /** Current bid or Buy It Now price. */
  hammerPrice: number | null;
  /** Copart's "Estimated retail value", used as the after-repair value. */
  arv: number | null;
  primaryDamage: string | null;
  secondaryDamage: string | null;
  odometer: number | null;
  colour: string | null;
  fuel: string | null;
  bodyStyle: string | null;
  yardName: string | null;
  images: string[];
}

/** Messages the injected extraction script posts back from a React Native WebView. */
export type WebViewMessage =
  | { type: "LOT_DATA"; data: LotData }
  | { type: "ERROR"; message: string };
