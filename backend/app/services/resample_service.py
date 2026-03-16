from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.models import (
    RawMetric, ResampleMetricMinute, ResampleMetricHourly, ResampleMetricHistory,
    ResampleMetricDaily, ResampleState
)


class ResampleService:
    """
    Handles metric resampling for long-term storage.
    
    Key requirements:
    - Runs at fixed intervals (every minute for minute resampling)
    - Handles gaps in data (doesn't fill missing periods)
    - First value after gap is not resampled (waits for next interval)
    - Raw data is deleted only after successful resampling
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def resample_minute(self, current_ts: int) -> int:
        """
        Aggregate raw metrics into minute windows.

        Algorithm:
        1. Get last processed timestamp
        2. Find the minute window that should be processed (previous minute)
        3. Check if we have complete data for that window
        4. If gap detected (no data in window), skip and update last_ts
        5. If data exists, aggregate and insert
        """
        last_ts = await ResampleState.get_last_ts(self.session, 'minute')

        # Calculate the minute window to process
        # We process the PREVIOUS complete minute
        window_end = (current_ts // 60) * 60  # Start of current minute
        window_start = window_end - 60  # Previous minute

        # If we're far behind, process all missed windows
        # But skip windows with no data (gaps)
        processed = 0
        process_ts = last_ts + 60  # Next window to process

        while process_ts < window_end:
            window_ts = process_ts

            # Check if we have data for this window
            has_data = await self._check_window_data(
                window_start=window_ts,
                window_end=window_ts + 60
            )

            if has_data:
                # Aggregate this window
                count = await self._aggregate_window(
                    window_start=window_ts,
                    window_end=window_ts + 60,
                    target_table=ResampleMetricMinute
                )
                processed += count
            # If no data, we skip this window (gap remains as gap)

            process_ts += 60

        # Update state
        await ResampleState.set_last_ts(self.session, 'minute', window_end)
        await self.session.commit()

        return processed
    
    async def _check_window_data(self, window_start: int, window_end: int) -> bool:
        """Check if any raw metrics exist in the window."""
        stmt = select(func.count()).select_from(RawMetric).where(
            RawMetric.timestamp >= window_start,
            RawMetric.timestamp < window_end
        )
        result = await self.session.execute(stmt)
        count = result.scalar()
        return count > 0
    
    async def _aggregate_window(
        self,
        window_start: int,
        window_end: int,
        target_table
    ) -> int:
        """
        Aggregate raw metrics for a time window.
        Groups by (device_id, name) and calculates min/max/avg.
        """
        # Aggregate query
        stmt = select(
            RawMetric.device_id,
            RawMetric.name,
            func.min(RawMetric.value),
            func.max(RawMetric.value),
            func.avg(RawMetric.value)
        ).where(
            RawMetric.timestamp >= window_start,
            RawMetric.timestamp < window_end
        ).group_by(
            RawMetric.device_id,
            RawMetric.name
        )
        
        results = await self.session.execute(stmt)
        
        # Insert aggregated
        aggregated = [
            target_table(
                timestamp=window_start,
                device_id=row[0],
                name=row[1],
                min_value=float(row[2]),
                max_value=float(row[3]),
                avg_value=float(row[4])
            )
            for row in results.fetchall()
        ]
        
        if aggregated:
            self.session.add_all(aggregated)
        
        return len(aggregated)
    
    async def resample_hourly(self, current_ts: int) -> int:
        """
        Aggregate minute metrics into hour windows.
        Same gap-handling logic as minute resampling.
        """
        last_ts = await ResampleState.get_last_ts(self.session, 'hour')

        # Calculate the hour window to process
        window_end = (current_ts // 3600) * 3600  # Start of current hour
        window_start = window_end - 3600  # Previous hour

        processed = 0
        process_ts = last_ts + 3600

        while process_ts < window_end:
            window_ts = process_ts

            has_data = await self._check_hourly_window_data(
                window_start=window_ts,
                window_end=window_ts + 3600
            )

            if has_data:
                count = await self._aggregate_hourly_window(
                    window_start=window_ts,
                    window_end=window_ts + 3600,
                    target_table=ResampleMetricHistory
                )
                processed += count

            process_ts += 3600

        await ResampleState.set_last_ts(self.session, 'hour', window_end)
        await self.session.commit()

        return processed

    async def _check_hourly_window_data(self, window_start: int, window_end: int) -> bool:
        """Check if any minute metrics exist in the window."""
        stmt = select(func.count()).select_from(ResampleMetricMinute).where(
            ResampleMetricMinute.timestamp >= window_start,
            ResampleMetricMinute.timestamp < window_end
        )
        result = await self.session.execute(stmt)
        count = result.scalar()
        return count > 0

    async def _aggregate_hourly_window(
        self,
        window_start: int,
        window_end: int,
        target_table
    ) -> int:
        """Aggregate minute metrics into hour windows."""
        stmt = select(
            ResampleMetricMinute.device_id,
            ResampleMetricMinute.name,
            func.min(ResampleMetricMinute.min_value),
            func.max(ResampleMetricMinute.max_value),
            func.avg(ResampleMetricMinute.avg_value)
        ).where(
            ResampleMetricMinute.timestamp >= window_start,
            ResampleMetricMinute.timestamp < window_end
        ).group_by(
            ResampleMetricMinute.device_id,
            ResampleMetricMinute.name
        )
        
        results = await self.session.execute(stmt)
        
        aggregated = [
            target_table(
                timestamp=window_start,
                device_id=row[0],
                name=row[1],
                min_value=float(row[2]),
                max_value=float(row[3]),
                avg_value=float(row[4])
            )
            for row in results.fetchall()
        ]
        
        if aggregated:
            self.session.add_all(aggregated)

        return len(aggregated)
    
    async def resample_daily(self, current_ts: int) -> int:
        """
        Aggregate hourly metrics into day windows.
        Same gap-handling logic as minute/hourly resampling.
        """
        last_ts = await ResampleState.get_last_ts(self.session, 'daily')

        # Calculate the day window to process
        window_end = (current_ts // 86400) * 86400  # Start of current day (midnight UTC)
        window_start = window_end - 86400  # Previous day

        processed = 0
        process_ts = last_ts + 86400

        while process_ts < window_end:
            window_ts = process_ts

            has_data = await self._check_daily_window_data(
                window_start=window_ts,
                window_end=window_ts + 86400
            )

            if has_data:
                count = await self._aggregate_daily_window(
                    window_start=window_ts,
                    window_end=window_ts + 86400,
                    target_table=ResampleMetricDaily
                )
                processed += count

            process_ts += 86400

        await ResampleState.set_last_ts(self.session, 'daily', window_end)
        await self.session.commit()

        return processed
    
    async def _check_daily_window_data(self, window_start: int, window_end: int) -> bool:
        """Check if any daily metrics exist in the window."""
        stmt = select(func.count()).select_from(ResampleMetricHistory).where(
            ResampleMetricHistory.timestamp >= window_start,
            ResampleMetricHistory.timestamp < window_end
        )
        result = await self.session.execute(stmt)
        count = result.scalar()
        return count > 0
    
    async def _aggregate_daily_window(
        self,
        window_start: int,
        window_end: int,
        target_table
    ) -> int:
        """Aggregate daily metrics into day windows."""
        stmt = select(
            ResampleMetricHistory.device_id,
            ResampleMetricHistory.name,
            func.min(ResampleMetricHistory.min_value),
            func.max(ResampleMetricHistory.max_value),
            func.avg(ResampleMetricHistory.avg_value)
        ).where(
            ResampleMetricHistory.timestamp >= window_start,
            ResampleMetricHistory.timestamp < window_end
        ).group_by(
            ResampleMetricHistory.device_id,
            ResampleMetricHistory.name
        )

        results = await self.session.execute(stmt)

        aggregated = [
            target_table(
                timestamp=window_start,
                device_id=row[0],
                name=row[1],
                min_value=float(row[2]),
                max_value=float(row[3]),
                avg_value=float(row[4])
            )
            for row in results.fetchall()
        ]

        if aggregated:
            self.session.add_all(aggregated)

        return len(aggregated)
