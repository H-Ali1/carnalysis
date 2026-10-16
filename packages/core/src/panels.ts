// Damage and panel vocabulary shared with the backend (backend/app/models.py).

export const DAMAGE_TYPES = ["scratch", "scuff", "dent", "crack", "missing"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

// "os" / "ns" are the UK offside (driver) and nearside (passenger) conventions.
export const PANELS = [
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
] as const;
export type Panel = (typeof PANELS)[number]["value"];

export function panelLabel(panel: Panel): string {
  return PANELS.find((p) => p.value === panel)?.label ?? panel;
}
