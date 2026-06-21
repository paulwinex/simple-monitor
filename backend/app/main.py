import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.persistence import init_db
from app.api import metrics_router, hosts_router, devices_router, dashboards_router
from app.scheduler import SchedulerManager


# Configure logging
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Monitor Backend...")
    await init_db()
    logger.info("Database initialized")
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
