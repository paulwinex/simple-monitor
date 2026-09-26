import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api import (
    metrics_router,
    hosts_router,
    devices_router,
    dashboards_router,
    themes_router,
)
from app.scheduler import SchedulerManager


# Configure logging
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def _seed_theme_presets() -> None:
    """Insert the built-in themes, but only into an empty table.

    A failed seed must not stop the API from serving, so this logs and moves
    on: the frontend has its own static fallback theme for that case.
    """
    from app.persistence import get_session_context
    from app.services.theme_service import ThemeService

    try:
        async with get_session_context() as session:
            added = await ThemeService(session).ensure_presets()
        if added:
            logger.info("Seeded %d built-in themes", added)
    except Exception:
        logger.exception("Could not seed built-in themes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Monitor Backend...")
    await _seed_theme_presets()
    scheduler = SchedulerManager(
        resample_minute_interval=settings.RESAMPLE_MINUTE_INTERVAL,
        resample_hourly_interval=settings.RESAMPLE_HOURLY_INTERVAL
    )
    scheduler.start()
    logger.info("Scheduler started")
    yield
    logger.info("Shutting down Simple Monitor Backend...")
    if scheduler:
        scheduler.shutdown()
    logger.info("Shutdown complete")

app = FastAPI(
    title="Simple Monitor API",
    description="NAS Server Monitoring API",
    version="0.0.1",
    lifespan=lifespan
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.warning(
        "Validation error %s %s: body=%s errors=%s",
        request.method,
        request.url.path,
        body.decode(errors="replace") if body else "",
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics_router, prefix="/api/v1")
app.include_router(hosts_router, prefix="/api/v1")
app.include_router(devices_router, prefix="/api/v1")
app.include_router(dashboards_router, prefix="/api/v1")
app.include_router(themes_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root(request: Request):
    return {
        "name": "Simple Monitor API",
        "version": "0.0.1",
        "docs": f"{request.base_url}docs"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
