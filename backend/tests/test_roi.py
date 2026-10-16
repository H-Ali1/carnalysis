import pytest

from app.roi import COPART_FEE_RATE, DEFAULT_TRANSPORT_GBP, calculate_roi


def test_breakdown_adds_fees_parts_and_transport() -> None:
    result = calculate_roi(hammer_price=1000, arv=3000, total_parts=200, transport=100)

    assert result.copart_fee_rate == COPART_FEE_RATE
    assert result.copart_fees == pytest.approx(120)
    assert result.total_cost == pytest.approx(1420)
    assert result.profit_estimate == pytest.approx(1580)
    assert result.roi_percent == pytest.approx(111.3)


def test_defaults_to_flat_transport() -> None:
    result = calculate_roi(hammer_price=1000, arv=3000, total_parts=0)

    assert result.transport == DEFAULT_TRANSPORT_GBP


def test_reports_losses_as_negative_profit() -> None:
    result = calculate_roi(hammer_price=2000, arv=2000, total_parts=0, transport=0)

    assert result.profit_estimate == pytest.approx(-240)
    assert result.roi_percent < 0


def test_zero_cost_does_not_divide_by_zero() -> None:
    result = calculate_roi(hammer_price=0, arv=500, total_parts=0, transport=0)

    assert result.roi_percent == 0.0
