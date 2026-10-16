"""HTTP entry point. Run with ``uvicorn app.main:app --reload`` from ``backend/``."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import partial
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.analysis import AnalysisError, analyze_lot
from app.config import Settings, get_settings
from app.damage import DamageDetectionUnavailableError, DamageDetector, detect_damage
from app.models import AnalyzeRequest, AnalyzeResponse
from app.pricing import EbayPartPricer, PartPricer, UnconfiguredPricer

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

HTTP_TIMEOUT_S = 15.0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Share one pooled HTTP client (and the eBay token cache) across all requests."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as http:
        app.state.http = http
        if settings.ebay_configured:
            app.state.pricer = EbayPartPricer(
                http, settings.ebay_client_id, settings.ebay_client_secret
            )
        else:
            logger.warning("eBay credentials not set; analyses will exclude part prices.")
            app.state.pricer = UnconfiguredPricer()
        yield


app = FastAPI(
    title="Carnalysis",
    summary="Profit and ROI estimates for Copart UK salvage auction lots.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_pricer(request: Request) -> PartPricer:
    pricer: PartPricer = request.app.state.pricer
    return pricer


def get_damage_detector(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> DamageDetector:
    return partial(
        detect_damage, model_path=settings.damage_model_path, http=request.app.state.http
    )


@app.exception_handler(AnalysisError)
async def _analysis_error(_: Request, exc: AnalysisError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.exception_handler(DamageDetectionUnavailableError)
async def _detection_unavailable(_: Request, exc: DamageDetectionUnavailableError) -> JSONResponse:
    return JSONResponse(status_code=501, content={"detail": str(exc)})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/analyze",
    responses={
        400: {"description": "The vehicle or damage couldn't be determined from the request."},
        501: {"description": "Automatic damage detection isn't enabled on this server."},
    },
)
async def analyze(
    payload: AnalyzeRequest,
    pricer: Annotated[PartPricer, Depends(get_pricer)],
    detect: Annotated[DamageDetector, Depends(get_damage_detector)],
) -> AnalyzeResponse:
    """Estimate the profit and ROI of buying, repairing and reselling a lot."""
    return await analyze_lot(payload, pricer=pricer, detect_damage=detect)
