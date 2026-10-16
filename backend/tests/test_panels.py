from typing import get_args

from app.models import DamageType, Panel
from app.panels import DAMAGE_SEVERITY, PART_REQUIRED, PART_SEARCH


def test_every_panel_has_a_search_configuration() -> None:
    assert set(PART_SEARCH) == set(get_args(Panel))


def test_every_damage_type_has_a_repair_rule_and_severity() -> None:
    assert set(PART_REQUIRED) == set(get_args(DamageType))
    assert set(DAMAGE_SEVERITY) == set(get_args(DamageType))
