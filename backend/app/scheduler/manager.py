import time
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.persistence import get_session_context
from app.services import ResampleService, RetentionService

logger = logging.getLogger(__name__)


class SchedulerManager:
    """Manages background jobs for resampling and retention cleanup."""
    
    def __init__(
        self,
        resample_minute_interval: int = 60,
        resample_hourly_interval: int = 3600
    ):
        self.scheduler = AsyncIOScheduler()
        self.resample_minute_interval = resample_minute_interval
        self.resample_hourly_interval = resample_hourly_interval
    
    def start(self):
        """Start the scheduler with all jobs."""
        # Resampling jobs - run at fixed intervals
        # Minute resampling runs every minute
        self.scheduler.add_job(
            self._run_minute_resample,
            'interval',
            seconds=self.resample_minute_interval,
            id='resample_minute'
        )
        
        # Hourly resampling runs every hour
        self.scheduler.add_job(
            self._run_hourly_resample,
            'interval',
            seconds=self.resample_hourly_interval,
            id='resample_hourly'
        )

        # Daily resampling runs once per day (at 1 AM)
        self.scheduler.add_job(
            self._run_daily_resample,
            'cron',
            hour=1,  # 1 AM daily
            id='resample_daily'
        )

        # Retention jobs - run at 3 AM daily
        self.scheduler.add_job(
            self._run_retention_cleanup,
            'cron',
            hour=3,  # 3 AM daily
            id='retention_cleanup'
        )
        
        self.scheduler.start()
        logger.info("Scheduler started with jobs: resample_minute, resample_hourly, resample_daily, retention_cleanup")
    
    async def _run_minute_resample(self):
        """Run minute resampling at fixed interval."""
        logger.debug("Running minute resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_minute(current_ts)
            logger.debug(f"Minute resample completed: {count} aggregates")
    
    async def _run_hourly_resample(self):
        """Run hourly resampling at fixed interval."""
        logger.debug("Running hourly resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_hourly(current_ts)
            logger.debug(f"Hourly resample completed: {count} aggregates")

    async def _run_daily_resample(self):
        """Run daily resampling at fixed interval (once per day)."""
        logger.debug("Running daily resample job")
        async with get_session_context() as session:
            service = ResampleService(session)
            current_ts = int(time.time())
            count = await service.resample_daily(current_ts)
            logger.debug(f"Daily resample completed: {count} aggregates")

    async def _run_retention_cleanup(self):
        """Run retention cleanup - only deletes resampled data."""
        logger.debug("Running retention cleanup job")
        async with get_session_context() as session:
            service = RetentionService(session)
            raw_deleted = await service.cleanup_raw()
            hourly_deleted = await service.cleanup_hourly()
            logger.debug(f"Retention cleanup completed: {raw_deleted} raw, {hourly_deleted} hourly deleted")
    
    def shutdown(self):
        """Shutdown the scheduler."""
        self.scheduler.shutdown()
        logger.info("Scheduler shutdown")
