import time
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.services.base import BaseService
from app.persistence.models import Host, HostConfig, Device


class HostService(BaseService):
    """Service for host management."""
    
    async def register_host(self, host_id: str, collectors: list[str]) -> Host:
        """Register a new host or update existing one."""
        stmt = select(Host).where(Host.host_id == host_id)
        result = await self.session.execute(stmt)
        host = result.scalar_one_or_none()
        
        now = int(time.time())
        
        if host:
            host.last_seen = now
        else:
            host = Host(host_id=host_id, registered_at=now, last_seen=now)
            self.session.add(host)
        
        await self.session.flush()
        
        stmt = select(HostConfig).where(HostConfig.host_id == host_id)
        result = await self.session.execute(stmt)
        config = result.scalar_one_or_none()
        
        if not config:
            default_config = {
                "cpu": {"enabled": True, "interval_sec": 5},
                "ram": {"enabled": True, "interval_sec": 5},
                "network": {"enabled": True, "interval_sec": 2},
                "storage": {"enabled": True, "interval_sec": 60},
                "zfs_pool": {"enabled": True, "interval_sec": 60},
            }
            collectors_dict = {
                c: default_config[c] for c in collectors if c in default_config
            }
            config = HostConfig(
                host_id=host_id,
                version=1,
                config=collectors_dict,
                updated_at=now
            )
            self.session.add(config)
        
        await self.session.commit()
        return host
    
    async def get_host_config(self, host_id: str) -> HostConfig | None:
        """Get host configuration."""
        stmt = select(HostConfig).where(HostConfig.host_id == host_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_config_version(self, host_id: str) -> int:
        """Get configuration version for a host."""
        config = await self.get_host_config(host_id)
        return config.version if config else 0
    
    async def update_host_config(self, host_id: str, collectors: dict) -> HostConfig:
        """Update host configuration."""
        stmt = select(Host).where(Host.host_id == host_id)
        result = await self.session.execute(stmt)
        host = result.scalar_one_or_none()
        
        if not host:
            raise ValueError("Host not found")
        
        config = await self.get_host_config(host_id)
        now = int(time.time())
        
        if config:
            config.config = collectors
            config.version += 1
            config.updated_at = now
        else:
            config = HostConfig(
                host_id=host_id,
                version=1,
                config=collectors,
                updated_at=now
            )
            self.session.add(config)
        
        await self.session.commit()
        return config
    
    async def host_exists(self, host_id: str) -> bool:
        """Check if host exists."""
        stmt = select(Host).where(Host.host_id == host_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_all_hosts_with_devices(self) -> list[Host]:
        """Get all hosts with their devices eagerly loaded."""
        stmt = (
            select(Host)
            .options(joinedload(Host.devices))
            .order_by(Host.registered_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())
