from sqlalchemy import select

from app.services.base import BaseService
from app.persistence.models import Device


class DeviceService(BaseService):
    """Service for device management."""
    
    async def list_devices(self, host_id: str) -> list[Device]:
        """List all devices for a host."""
        stmt = select(Device).where(Device.host_id == host_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_device(self, host_id: str, device_id: str) -> Device | None:
        """Get a specific device."""
        stmt = select(Device).where(
            Device.host_id == host_id,
            Device.name == device_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def delete_device(self, host_id: str, device_id: str) -> bool:
        """Delete a device and all its metrics."""
        device = await self.get_device(host_id, device_id)
        if not device:
            return False
        
        await self.session.delete(device)
        await self.session.commit()
        
        return True
        return True




