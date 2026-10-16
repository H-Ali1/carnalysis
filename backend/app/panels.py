"""Panel catalogue: how each panel is searched for on eBay, and which damage needs a part."""

from typing import NamedTuple

from app.models import DamageType, Panel


class PartSearch(NamedTuple):
    term: str
    """Appended to "<year> <make> <model>" to form the eBay query."""
    min_price: int
    """Price floor in GBP that filters out sub-components such as clips and brackets."""


PART_SEARCH: dict[Panel, PartSearch] = {
    "front_bumper": PartSearch("front bumper complete", 30),
    "rear_bumper": PartSearch("rear bumper complete", 25),
    "bonnet": PartSearch("bonnet complete", 40),
    "tailgate": PartSearch("tailgate complete", 40),
    "roof": PartSearch("roof panel", 60),
    "front_wing_os": PartSearch("front wing driver side", 20),
    "front_wing_ns": PartSearch("front wing passenger side", 20),
    "door_front_os": PartSearch("front door complete driver", 35),
    "door_front_ns": PartSearch("front door complete passenger", 35),
    "door_rear_os": PartSearch("rear door complete driver", 30),
    "door_rear_ns": PartSearch("rear door complete passenger", 30),
    "rear_quarter_os": PartSearch("rear quarter panel driver", 50),
    "rear_quarter_ns": PartSearch("rear quarter panel passenger", 50),
    "headlight_os": PartSearch("headlight driver side", 20),
    "headlight_ns": PartSearch("headlight passenger side", 20),
    "taillight_os": PartSearch("rear light driver side", 15),
    "taillight_ns": PartSearch("rear light passenger side", 15),
}

# Cosmetic damage is repaired in place; structural damage needs a replacement part.
PART_REQUIRED: dict[DamageType, bool] = {
    "scratch": False,
    "scuff": False,
    "dent": False,
    "crack": True,
    "missing": True,
}

# Most severe first; used to collapse several detections on one panel into one repair.
DAMAGE_SEVERITY: tuple[DamageType, ...] = ("missing", "crack", "dent", "scuff", "scratch")
