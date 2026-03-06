import time
from sqlalchemy import select

from app.services.base import BaseService
from app.persistence.models import Device, Host, RawMetric
from app.shemas import BatchIngestRequest, MetricOut


class MetricsService(BaseService):
    """Service for metrics ingestion and querying."""
    
    async def ingest_metrics(self, payload: BatchIngestRequest) -> int:
        """Ingest batch of metrics."""
        if not payload.metrics:
            return 0
        
        device_cache: dict[str, Device] = {}
        
        for m in payload.metrics:
            if m.device_id not in device_cache:
                device_cache[m.device_id] = await self._get_or_create_device(
                    host_id=payload.host_id,
                    device_id=m.device_id,
                    device_type=m.device_type
                )
        
        raw_metrics = [
            RawMetric(
                timestamp=m.timestamp,
                device_id=device_cache[m.device_id].id,
                name=m.name,
                value=int(m.value)
            )
            for m in payload.metrics
        ]
        
        self.session.add_all(raw_metrics)
        await self.session.commit()
        
        return len(raw_metrics)
    
    async def _get_or_create_device(
        self,
        host_id: str,
        device_id: str,
        device_type: str
    ) -> Device:
        """Get or create a device for the given host."""
        host = await self._get_or_create_host(host_id)
        
        stmt = select(Device).where(
            Device.host_id == host.host_id,
            Device.name == device_id
        )
        result = await self.session.execute(stmt)
        device = result.scalar_one_or_none()
        
        if device:
            return device
        
        device = Device(
            host_id=host.host_id,
            name=device_id,
            type=device_type,
            label=self._get_default_label(device_type, device_id),
            details={},
            enabled=True
        )
        self.session.add(device)
        await self.session.flush()
        
        return device
    
    async def _get_or_create_host(self, host_id: str) -> Host:
        """Get or create a host."""
        stmt = select(Host).where(Host.host_id == host_id)
        result = await self.session.execute(stmt)
        host = result.scalar_one_or_none()
        
        now = int(time.time())
        
        if host:
            host.last_seen = now
            await self.session.flush()
            return host
        
        host = Host(host_id=host_id, registered_at=now, last_seen=now)
        self.session.add(host)
        await self.session.flush()
        
        return host
    
    def _get_default_label(self, device_type: str, device_id: str) -> str:
        """Get default label for device type."""
        labels = {
            "cpu": "CPU",
            "ram": "RAM",
            "network": "Network",
            "hdd": "HDD",
            "ssd": "SSD",
            "zfs_pool": "ZFS Pool",
        }
        return labels.get(device_type, device_type.title())
    
    async def query_metrics(
        self,
        host_id: str,
        device_id: str,
        name: str,
        start_ts: int,
        end_ts: int,
        table: str = "raw",
        limit: int = 1000
    ) -> list[MetricOut]:
        """Query metrics with optimal table selection."""
        device = await self._get_device(host_id, device_id)
        if not device:
            return []
        
        from app.persistence.models import (
            RawMetric, ResampleMetricHourly, ResampleMetricHistory, ResampleMetricDaily
        )
        
        model_class = {
            "raw": RawMetric,
            "hourly": ResampleMetricHourly,
            "history": ResampleMetricHistory,
            "daily": ResampleMetricDaily,
        }.get(table, RawMetric)
        
        results = await model_class.get_range(
            self.session,
            device_id=device.id,
            label=name,
            start_ts=start_ts,
            end_ts=end_ts,
            limit=limit
        )
        
        return [MetricOut(timestamp=ts, value=val) for ts, val in results]
    
    async def query_latest(
        self,
        host_id: str,
        device_id: str,
        name: str
    ) -> MetricOut | None:
        """Get latest metric value."""
        device = await self._get_device(host_id, device_id)
        if not device:
            return None
        
        stmt = select(RawMetric).where(
            RawMetric.device_id == device.id,
            RawMetric.name == name
        ).order_by(RawMetric.timestamp.desc()).limit(1)
        
        result = await self.session.execute(stmt)
        metric = result.scalar_one_or_none()
        
        if metric:
            return MetricOut(timestamp=metric.timestamp, value=float(metric.value))
        return None
    
    async def _get_device(self, host_id: str, device_id: str) -> Device | None:
        """Get device by host and device ID."""
        stmt = select(Device).where(
            Device.host_id == host_id,
            Device.name == device_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_devices(self, host_id: str) -> list[dict]:
        """List all devices for a host with their metrics."""
        stmt = select(Device).where(Device.host_id == host_id)
        result = await self.session.execute(stmt)
        devices = result.scalars().all()
        
        device_list = []
        for device in devices:
            metrics = await self._get_device_metrics(device.id)
            device_list.append({
                "name": device.name,
                "type": device.type,
                "label": device.label,
                "metrics": metrics
            })
        
        return device_list
    
    async def _get_device_metrics(self, device_id: int) -> list[str]:
        """Get list of metric names for a device."""
        stmt = select(RawMetric.name).where(
            RawMetric.device_id == device_id
        ).distinct()
        
        result = await self.session.execute(stmt)
        return [row[0] for row in result.fetchall()]
