from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence import get_session
from app.services import (
    MetricsService, HostService, DeviceService
)


# Type aliases for dependency injection
SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_metrics_service(session: SessionDep) -> MetricsService:
    """Get MetricsService instance."""
    return MetricsService(session)


async def get_host_service(session: SessionDep) -> HostService:
    """Get HostService instance."""
    return HostService(session)


async def get_device_service(session: SessionDep) -> DeviceService:
    """Get DeviceService instance."""
    return DeviceService(session)


# Annotated dependencies for FastAPI
MetricsServiceDep = Annotated[MetricsService, Depends(get_metrics_service)]
HostServiceDep = Annotated[HostService, Depends(get_host_service)]
DeviceServiceDep = Annotated[DeviceService, Depends(get_device_service)]
