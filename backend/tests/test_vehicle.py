import pytest

from app.models import Vehicle
from app.vehicle import parse_lot_title


@pytest.mark.parametrize(
    ("title", "make", "model"),
    [
        ("2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR", "Volkswagen", "Polo"),
        ("2019 AUDI TT 2.0 TFSI S LINE", "Audi", "TT"),
        ("2019 AUDI A3 35 TFSI S LINE", "Audi", "A3"),
        ("2018 FORD TRANSIT CONNECT 200 L1 1.5 TDCI", "Ford", "Transit Connect"),
        ("2020 LAND ROVER RANGE ROVER EVOQUE 2.0", "Land Rover", "Range Rover Evoque"),
        ("2018 ALFA ROMEO GIULIA 2.0 TB", "Alfa Romeo", "Giulia"),
        ("2021 TESLA MODEL 3 LONG RANGE AWD", "Tesla", "Model 3"),
        ("2019 VOLVO XC90 2.0 D5", "Volvo", "XC90"),
        ("2018 MAZDA CX-5 2.2D SPORT NAV", "Mazda", "CX-5"),
        ("2014 VAUXHALL CORSA 1.2 SXI AC 3DR", "Vauxhall", "Corsa"),
        ("2020 MG ZS 1.5 EXCITE", "MG", "ZS"),
        ("2016 FIAT 500 1.2 POP", "Fiat", "500"),
        ("2019 KIA SPORTAGE [163] 1.6 T-GDI GT-LINE", "Kia", "Sportage"),
        ("2017 nissan qashqai 1.5 dci", "Nissan", "Qashqai"),
    ],
)
def test_parses_real_world_titles(title: str, make: str, model: str) -> None:
    year = int(title[:4])
    assert parse_lot_title(title) == Vehicle(make=make, model=model, year=year)


@pytest.mark.parametrize(
    "title",
    [
        "",
        "VOLKSWAGEN POLO 1.0",  # no year
        "1899 FORD MODEL T",  # implausible year
        "2017 UNKNOWNMAKE THING 1.0",  # unknown make
        "2017 MINIBUS COACH",  # a make must match a whole word, not a prefix of "MINI"
        "2017 VOLKSWAGEN 1.0 TSI",  # no model before the engine size
    ],
)
def test_rejects_unparseable_titles(title: str) -> None:
    assert parse_lot_title(title) is None
