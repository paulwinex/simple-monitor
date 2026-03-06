import psutil

from sm_client.sensors.base import BaseCollector, Metric


class RAMCollector(BaseCollector):
    """RAM metrics collector (usage, used_gb)."""
    device_type = "ram"
    
    async def collect(self) -> list[Metric]:
        """Collect RAM metrics."""
        metrics = []
        
        # Virtual memory
        vm = psutil.virtual_memory()
        
        # Usage percent
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="ram",
            device_type=self.device_type,
            name="usage_percent",
            timestamp=self._now_timestamp(),
            value=int(vm.percent)
        ))
        
        # Used GB (as integer MB for precision)
        used_mb = int(vm.used / (1024 * 1024))
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="ram",
            device_type=self.device_type,
            name="used_mb",
            timestamp=self._now_timestamp(),
            value=used_mb
        ))
        
        # Total GB
        total_mb = int(vm.total / (1024 * 1024))
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="ram",
            device_type=self.device_type,
            name="total_mb",
            timestamp=self._now_timestamp(),
            value=total_mb
        ))
        
        # Available MB
        available_mb = int(vm.available / (1024 * 1024))
        metrics.append(Metric(
            host_id=self.host_id,
            device_id="ram",
            device_type=self.device_type,
            name="available_mb",
            timestamp=self._now_timestamp(),
            value=available_mb
        ))
        
        # Swap memory
        swap = psutil.swap_memory()
        if swap.total > 0:
            metrics.append(Metric(
                host_id=self.host_id,
                device_id="ram",
                device_type=self.device_type,
                name="swap_percent",
                timestamp=self._now_timestamp(),
                value=int(swap.percent)
            ))
            
            swap_used_mb = int(swap.used / (1024 * 1024))
            metrics.append(Metric(
                host_id=self.host_id,
                device_id="ram",
                device_type=self.device_type,
                name="swap_used_mb",
                timestamp=self._now_timestamp(),
                value=swap_used_mb
            ))
        
        return metrics
    
    @classmethod
    async def check_availability(cls) -> bool:
        """Check if psutil is available."""
        try:
            psutil.virtual_memory()
            return True
        except Exception:
            return False
