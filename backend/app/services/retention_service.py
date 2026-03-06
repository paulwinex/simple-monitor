import time
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.models import RawMetric, ResampleMetricHourly, ResampleState


class RetentionService:
    """
    Handles data retention and cleanup.
    
    Key requirement:
    - Raw data is deleted ONLY after resampling is complete
    - This ensures no data loss if resampling job is delayed
    """
    
    def __init__(self, session: AsyncSession, retention_raw_days: int = 90, retention_hourly_days: int = 365):
        self.session = session
        self.retention_raw_sec = retention_raw_days * 86400
        self.retention_hourly_sec = retention_hourly_days * 86400
    
    async def cleanup_raw(self) -> int:
        """
        Delete raw metrics older than retention period.
        Only deletes data that has been successfully resampled.
        """
        # Get the last resampled timestamp
        last_resampled = await ResampleState.get_last_ts(self.session, 'minute')
        
        # Calculate cutoff based on retention policy
        retention_cutoff = int(time.time()) - self.retention_raw_sec
        
        # Delete only data that is:
        # 1. Older than retention cutoff
        # 2. Already resampled (timestamp < last_resampled)
        safe_cutoff = min(retention_cutoff, last_resampled)
        
        stmt = delete(RawMetric).where(
            RawMetric.timestamp < safe_cutoff
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount or 0
    
    async def cleanup_hourly(self) -> int:
        """Delete hourly aggregates older than retention period."""
        cutoff = int(time.time()) - self.retention_hourly_sec
        stmt = delete(ResampleMetricHourly).where(
            ResampleMetricHourly.timestamp < cutoff
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        
        return result.rowcount or 0
