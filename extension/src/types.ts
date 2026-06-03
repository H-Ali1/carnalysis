// Shared types mirroring the FastAPI backend contract (backend/models.py).

export type DamageType = "scratch" | "scuff" | "dent" | "crack" | "missing";

export const DAMAGE_TYPES: DamageType[] = [
  "scratch",
  "scuff",
  "dent",
  "crack",
  "missing",
];

// Panel keys must match backend/panel_config.py PANEL_SEARCH_TERMS.
export const PANELS: { value: string; label: string }[] = [
  { value: "front_bumper", label: "Front bumper" },
  { value: "rear_bumper", label: "Rear bumper" },
  { value: "bonnet", label: "Bonnet" },
  { value: "tailgate", label: "Tailgate" },
  { value: "roof", label: "Roof" },
  { value: "front_wing_os", label: "Front wing (driver)" },
  { value: "front_wing_ns", label: "Front wing (passenger)" },
  { value: "door_front_os", label: "Front door (driver)" },
  { value: "door_front_ns", label: "Front door (passenger)" },
  { value: "door_rear_os", label: "Rear door (driver)" },
  { value: "door_rear_ns", label: "Rear door (passenger)" },
  { value: "rear_quarter_os", label: "Rear quarter (driver)" },
  { value: "rear_quarter_ns", label: "Rear quarter (passenger)" },
  { value: "headlight_os", label: "Headlight (driver)" },
  { value: "headlight_ns", label: "Headlight (passenger)" },
  { value: "taillight_os", label: "Tail light (driver)" },
  { value: "taillight_ns", label: "Tail light (passenger)" },
];

export interface DamageObservation {
  panel: string;
  damage_type: DamageType;
}

// Raw data scraped from a Copart lot page.
export interface LotData {
  lotTitle: string;
  lotNumber: string | null;
  hammerPrice: number | null; // current bid / buy-it-now
  arv: number | null; // Copart "Estimated retail value"
  primaryDamage: string | null;
  secondaryDamage: string | null;
  odometer: number | null;
  colour: string | null;
  fuel: string | null;
  bodyStyle: string | null;
  yardName: string | null;
  images: string[];
}

export interface AnalyzeRequest {
  lot_title: string;
  damage_observations: DamageObservation[];
  images: string[];
  hammer_price: number;
  arv: number;
  transport?: number;
}

export interface PanelEstimate {
  panel: string;
  damage_type: string;
  parts_cost: number;
}

export interface AnalyzeResponse {
  observations: PanelEstimate[];
  hammer_price: number;
  copart_fees: number;
  total_parts: number;
  transport: number;
  total_cost: number;
  arv: number;
  profit_estimate: number;
  roi_percent: number;
}
