from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app, get_pricer
from tests.fakes import FakePricer


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def pricer() -> FakePricer:
    return FakePricer({"front_bumper": 120.0, "headlight_os": 45.5})


@pytest.fixture
def client(pricer: FakePricer) -> Iterator[TestClient]:
    app.dependency_overrides[get_pricer] = lambda: pricer
    # Ignore any local backend/.env so tests behave the same everywhere.
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
