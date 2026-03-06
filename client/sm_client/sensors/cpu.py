import psutil

from sm_client.sensors.base import BaseCollector, Metric


class CPUCollector(BaseCollector):
    """CPU metrics collector (load, temp)."""
    device_type = "cpu"
    
    async def collect(self) -> list[Metric]:
        """Collect CPU metrics."""
        metrics = []
        
        # CPU load (percentage)
        load = psutil.cpu_percent(interval=0.1)
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="cpu",
            device_type=self.device_type,
            name="load",
            timestamp=self._now_timestamp(),
            value=int(load)
        ))
        
        # CPU count
        cpu_count = psutil.cpu_count()
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="cpu",
            device_type=self.device_type,
            name="cpu_count",
            timestamp=self._now_timestamp(),
            value=cpu_count
        ))
        
        # CPU frequency (if available)
        try:
            freq = psutil.cpu_freq()
            if freq:
                metrics.append(Metric(
                    host_id=self.host_id,
                    device_id="cpu",
                    device_type=self.device_type,
                    name="frequency_mhz",
                    timestamp=self._now_timestamp(),
                    value=int(freq.current)
                ))
        except Exception:
            pass
        
        return metrics
    
    @classmethod
    async def check_availability(cls) -> bool:
        """Check if psutil is available."""
        try:
            psutil.cpu_percent()
            return True
        except Exception:
            return False
