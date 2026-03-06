import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.persistence import init_db
from app.api import metrics_router, hosts_router, devices_router
from app.scheduler import SchedulerManager


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""

    # Startup
    logger.info("Starting Smart Monitor Backend...")
    
    # Initialize database
    settings = get_settings()
    await init_db(settings.DATABASE_URL)
    logger.info("Database initialized")
    
    # Start scheduler
    scheduler = SchedulerManager(
        resample_minute_interval=settings.RESAMPLE_MINUTE_INTERVAL,
        resample_hourly_interval=settings.RESAMPLE_HOURLY_INTERVAL
    )
    scheduler.start()
    logger.info("Scheduler started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Smart Monitor Backend...")
    if scheduler:
        scheduler.shutdown()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Smart Monitor API",
    description="NAS Server Monitoring API",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(metrics_router, prefix="/api/v1")
app.include_router(hosts_router, prefix="/api/v1")
app.include_router(devices_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {
        "name": "Smart Monitor API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
