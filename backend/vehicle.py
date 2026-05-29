import re
from typing import Optional


# Multi-word makes must come before their single-word prefixes so the longest
# match wins (e.g. "LAND ROVER" before "LAND").
KNOWN_MAKES = [
    "ALFA ROMEO", "ASTON MARTIN", "LAND ROVER", "MERCEDES-BENZ",
    "ROLLS ROYCE", "GREAT WALL",
    "AUDI", "BMW", "CITROEN", "DACIA", "FIAT", "FORD", "HONDA",
    "HYUNDAI", "JAGUAR", "JEEP", "KIA", "LEXUS", "LOTUS", "MAZDA",
    "MINI", "MITSUBISHI", "NISSAN", "PEUGEOT", "PORSCHE", "RENAULT",
    "SEAT", "SKODA", "SUBARU", "SUZUKI", "TESLA", "TOYOTA", "VAUXHALL",
    "VOLKSWAGEN", "VOLVO",
]

# Tokens that signal the engine/trim section has started — model ends before these.
_ENGINE_TOKENS = re.compile(
    r"""
    ^\d+\.\d+       # decimal engine size: 1.0, 2.5
    | ^\d+PS$       # power rating: 100PS
    | \[.*\]        # bracketed annotation: [163]
    | ^(TDCI|TDI|TFSI|TSI|CDI|HDI|CDTI|TCE|MHEV|PHEV|EV|HYBRID|
        GEARTRONIC|AUTOMATIC|MANUAL|AWD|4WD|4X4|QUATTRO|XDRIVE|
        ECOBOOST|ECOFLOW|BLUEHDI|BLUEMOTION|SPORTBACK)$
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Tokens that are body style — stop model extraction here too.
_BODY_TOKENS = re.compile(
    r"^(\d+DR|COUPE|CONVERTIBLE|ESTATE|SALOON|HATCHBACK|MPV|VAN|PICKUP|SUV|CROSSOVER)$",
    re.IGNORECASE,
)


def _is_engine_or_body(token: str) -> bool:
    return bool(_ENGINE_TOKENS.search(token) or _BODY_TOKENS.match(token))


def parse_lot_title(title: str) -> Optional[dict]:
    """
    Parse a Copart UK lot title into year, make, and model.

    Example:
        "2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR"
        -> {"year": 2017, "make": "Volkswagen", "model": "Polo"}
    """
    # Strip bracketed annotations before tokenising
    cleaned = re.sub(r"\[.*?\]", "", title).strip()
    tokens = cleaned.upper().split()

    if not tokens:
        return None

    # Step 1: year — must be the first token
    if not re.match(r"^\d{4}$", tokens[0]):
        return None
    year = int(tokens[0])
    if not (1990 <= year <= 2030):
        return None

    remaining = tokens[1:]

    # Step 2: make — try longest match first
    make_raw = None
    make_len = 0
    joined = " ".join(remaining)
    for candidate in sorted(KNOWN_MAKES, key=len, reverse=True):
        if joined.startswith(candidate):
            make_raw = candidate
            make_len = len(candidate.split())
            break

    if not make_raw:
        return None

    after_make = remaining[make_len:]

    # Step 3: model — consume tokens until we hit an engine/body descriptor.
    # Allow up to 3 tokens so multi-word models (TRANSIT CONNECT) are captured.
    model_tokens = []
    for token in after_make[:3]:
        if _is_engine_or_body(token):
            break
        # A plain integer (e.g. "25" in "25 TFSI") that isn't a known model
        # prefix signals the engine section when followed by a fuel/variant code.
        if re.match(r"^\d+$", token) and model_tokens:
            break
        model_tokens.append(token)

    if not model_tokens:
        return None

    model_raw = " ".join(model_tokens)

    return {
        "year": year,
        "make": make_raw.title().replace("-Benz", "-Benz"),
        "model": model_raw.title(),
    }
