# Repair approach per damage type — parts_needed drives eBay lookup
REPAIR_STRATEGY = {
    "scratch": {"parts_needed": False, "labor_gbp": 80},
    "scuff":   {"parts_needed": False, "labor_gbp": 80},
    "dent":    {"parts_needed": False, "labor_gbp": 150},
    "crack":   {"parts_needed": True,  "labor_gbp": 200},
    "missing": {"parts_needed": True,  "labor_gbp": 200},
}

# eBay search terms per panel (used when parts_needed=True)
PANEL_SEARCH_TERMS = {
    "front_bumper":    "front bumper cover",
    "rear_bumper":     "rear bumper cover",
    "bonnet":          "bonnet",
    "tailgate":        "tailgate boot lid",
    "roof":            "roof panel",
    "front_wing_os":   "front wing driver side",
    "front_wing_ns":   "front wing passenger side",
    "door_front_os":   "front door driver side",
    "door_front_ns":   "front door passenger side",
    "door_rear_os":    "rear door driver side",
    "door_rear_ns":    "rear door passenger side",
    "rear_quarter_os": "rear quarter panel driver",
    "rear_quarter_ns": "rear quarter panel passenger",
    "headlight_os":    "headlight driver side",
    "headlight_ns":    "headlight passenger side",
    "taillight_os":    "rear light driver side",
    "taillight_ns":    "rear light passenger side",
}

COPART_FEE_RATE = 0.12    # ~12% buyer's fee
TRANSPORT_GBP = 150       # flat-rate transport estimate
