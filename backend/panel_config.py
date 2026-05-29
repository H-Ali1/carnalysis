# Repair approach per damage type — parts_needed drives eBay lookup
REPAIR_STRATEGY = {
    "scratch": {"parts_needed": False, "labor_gbp": 80},
    "scuff":   {"parts_needed": False, "labor_gbp": 80},
    "dent":    {"parts_needed": False, "labor_gbp": 150},
    "crack":   {"parts_needed": True,  "labor_gbp": 200},
    "missing": {"parts_needed": True,  "labor_gbp": 200},
}

# eBay search config per panel: term used in query + min price floor to filter sub-components
PANEL_SEARCH_TERMS = {
    "front_bumper":    {"term": "front bumper complete",         "min_price": 30},
    "rear_bumper":     {"term": "rear bumper complete",          "min_price": 25},
    "bonnet":          {"term": "bonnet complete",               "min_price": 40},
    "tailgate":        {"term": "tailgate complete",             "min_price": 40},
    "roof":            {"term": "roof panel",                    "min_price": 60},
    "front_wing_os":   {"term": "front wing driver side",        "min_price": 20},
    "front_wing_ns":   {"term": "front wing passenger side",     "min_price": 20},
    "door_front_os":   {"term": "front door complete driver",    "min_price": 35},
    "door_front_ns":   {"term": "front door complete passenger", "min_price": 35},
    "door_rear_os":    {"term": "rear door complete driver",     "min_price": 30},
    "door_rear_ns":    {"term": "rear door complete passenger",  "min_price": 30},
    "rear_quarter_os": {"term": "rear quarter panel driver",     "min_price": 50},
    "rear_quarter_ns": {"term": "rear quarter panel passenger",  "min_price": 50},
    "headlight_os":    {"term": "headlight driver side",         "min_price": 20},
    "headlight_ns":    {"term": "headlight passenger side",      "min_price": 20},
    "taillight_os":    {"term": "rear light driver side",        "min_price": 15},
    "taillight_ns":    {"term": "rear light passenger side",     "min_price": 15},
}

COPART_FEE_RATE = 0.12    # ~12% buyer's fee
TRANSPORT_GBP = 150       # flat-rate transport estimate
