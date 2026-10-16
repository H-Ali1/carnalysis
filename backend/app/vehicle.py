"""Parse Copart UK lot titles into a vehicle identity.

Guest users can't see a lot's VIN or registration, but the title exposes year, make and
model, e.g. ``2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR``. That is all the part
search needs, so no external vehicle-data API is involved.
"""

import re
from datetime import date

from app.models import Vehicle

KNOWN_MAKES: tuple[str, ...] = (
    "ABARTH", "ALFA ROMEO", "ASTON MARTIN", "AUDI", "BMW", "BYD", "CHEVROLET", "CITROEN",
    "CUPRA", "DACIA", "DS", "FIAT", "FORD", "GENESIS", "GREAT WALL", "HONDA", "HYUNDAI",
    "INFINITI", "ISUZU", "JAGUAR", "JEEP", "KIA", "LAND ROVER", "LEXUS", "LOTUS", "MAZDA",
    "MERCEDES-BENZ", "MG", "MINI", "MITSUBISHI", "NISSAN", "PEUGEOT", "POLESTAR", "PORSCHE",
    "RENAULT", "ROLLS ROYCE", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI",
    "TESLA", "TOYOTA", "VAUXHALL", "VOLKSWAGEN", "VOLVO",
)  # fmt: skip

# Longest first, so "LAND ROVER" wins over any shorter make sharing its prefix.
_MAKES_LONGEST_FIRST = sorted(KNOWN_MAKES, key=len, reverse=True)

# Tokens that mark the start of the engine/trim section; the model ends before them.
_ENGINE_TOKEN = re.compile(
    r"""
    ^\d+\.\d+       # engine size, optionally suffixed: 1.0, 2.2D, 1.6T
    | ^\d+PS$       # power rating: 100PS
    | ^(TDCI|TDI|TFSI|TSI|CDI|HDI|CDTI|TCE|MHEV|PHEV|EV|HYBRID|
        GEARTRONIC|AUTOMATIC|MANUAL|AWD|4WD|4X4|QUATTRO|XDRIVE|
        ECOBOOST|ECOFLOW|BLUEHDI|BLUEMOTION|SPORTBACK)$
    """,
    re.VERBOSE,
)

# Body-style tokens also end the model.
_BODY_TOKEN = re.compile(
    r"^(\d+DR|COUPE|CONVERTIBLE|ESTATE|SALOON|HATCHBACK|MPV|VAN|PICKUP|SUV|CROSSOVER)$"
)

_YEAR = re.compile(r"^\d{4}$")
_INTEGER = re.compile(r"^\d+$")
_BRACKETED = re.compile(r"\[.*?\]")

_EARLIEST_YEAR = 1950
# Enough for multi-word models such as "TRANSIT CONNECT" or "RANGE ROVER EVOQUE".
_MAX_MODEL_TOKENS = 3


def parse_lot_title(title: str) -> Vehicle | None:
    """Extract year, make and model from a Copart UK lot title.

    Returns ``None`` unless the title starts with a plausible year followed by a known
    make; callers should then ask for the vehicle explicitly.

    Example::

        parse_lot_title("2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR")
        # -> Vehicle(make="Volkswagen", model="Polo", year=2017)
    """
    tokens = _BRACKETED.sub(" ", title).upper().split()
    if not tokens or not _YEAR.match(tokens[0]):
        return None

    year = int(tokens[0])
    if not _EARLIEST_YEAR <= year <= date.today().year + 1:
        return None

    make = _match_make(tokens[1:])
    if make is None:
        return None

    model_tokens = _take_model_tokens(tokens[1 + len(make.split()) :])
    if not model_tokens:
        return None

    return Vehicle(
        make=_smart_titlecase(make),
        model=_smart_titlecase(" ".join(model_tokens)),
        year=year,
    )


def _match_make(tokens: list[str]) -> str | None:
    joined = " ".join(tokens)
    for make in _MAKES_LONGEST_FIRST:
        if joined == make or joined.startswith(make + " "):
            return make
    return None


def _take_model_tokens(tokens: list[str]) -> list[str]:
    """Consume model tokens up to the first engine or body-style descriptor."""
    model: list[str] = []
    for token in tokens[:_MAX_MODEL_TOKENS]:
        if _ENGINE_TOKEN.match(token) or _BODY_TOKEN.match(token):
            break
        if _INTEGER.match(token) and model:
            # A bare number after the model name is normally power or a trim code
            # ("POLO 1.0 75", "A3 35 TFSI"). A single digit is usually part of the
            # name itself ("MODEL 3"), so keep it — but nothing after it.
            if len(token) == 1:
                model.append(token)
            break
        model.append(token)
    return model


def _smart_titlecase(name: str) -> str:
    """Title-case a make or model while keeping acronym-like tokens upper case.

    ``str.title()`` mangles names like "TT", "BMW" and "XC90" into "Tt", "Bmw" and
    "Xc90". A token stays upper case when its letters are few (three or fewer) and
    vowel-free — TT, RS, BMW, XC90, CX-5 — and is title-cased otherwise (Polo, Kia).
    """
    words = []
    for token in name.split():
        letters = [c for c in token if c.isalpha()]
        if len(letters) <= 3 and not any(c in "AEIOU" for c in letters):
            words.append(token.upper())
        else:
            words.append(token.title())
    return " ".join(words)
