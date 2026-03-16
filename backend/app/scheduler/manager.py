import time
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.persistence import get_session_context
from app.services import ResampleService, RetentionService
from app.config import settings

logger = logging.getLogger(__name__)


class SchedulerManager:
    def __init__(
            self,
            resample_minute_interval: int = 60,
            resample_hourly_interval: int = 3600
        ):
        self.scheduler = AsyncIOScheduler()
        self.resample_minute_interval = resample_minute_interval
        self.resample_hourly_interval = resample_hourly_interval

    def start(self):
        self.scheduler.add_job(
            self._run_minute_resample,
            'interval',
            seconds=self.resample_minute_interval,
            id='resample_minute'
        )
        
        self.scheduler.add_job(
            self._run_hourly_resample,
            'interval',
            seconds=self.resample_hourly_interval,
            id='resample_hourly'
        )

        self.scheduler.add_job(
            self._run_daily_resample,
            'cron',
            hour=1,
            id='resample_daily'
        )

        self.scheduler.add_job(
            self._run_retention_cleanup,
            'cron',
            hour=3,
            id='retention_cleanup'
        )
        
        self.scheduler.start()
        logger.info("Scheduler started")
    
    async def _run_minute_resample(self):
        logger.debug("Running minute resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_minute(current_ts)
            logger.debug(f"Minute resample completed: {count} aggregates")
    
    async def _run_hourly_resample(self):
        logger.debug("Running hourly resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_hourly(current_ts)
            logger.debug(f"Hourly resample completed: {count} aggregates")

    async def _run_daily_resample(self):
        logger.debug("Running daily resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_daily(current_ts)
            logger.debug(f"Daily resample completed: {count} aggregates")

    async def _run_retention_cleanup(self):
        logger.debug("Running retention cleanup job")
        async with get_session_context() as session:
            service = RetentionService(
                session,
                retention_raw_days=settings.RETENTION_RAW_DAYS,
                retention_minute_days=settings.RETENTION_MINUTE_DAYS
            )
            raw_deleted = await service.cleanup_raw()
            minute_deleted = await service.cleanup_minute()
            logger.debug(f"Retention cleanup completed: {raw_deleted} raw, {minute_deleted} minute deleted")
    
    def shutdown(self):
        self.scheduler.shutdown()
        logger.info("Scheduler shutdown")
