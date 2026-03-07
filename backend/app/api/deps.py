from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence import get_session
from app.services import (
    MetricsService,
    HostService,
    DeviceService,
    DashboardService,
)


SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_metrics_service(session: SessionDep) -> MetricsService:
    return MetricsService(session)


async def get_host_service(session: SessionDep) -> HostService:
    return HostService(session)


async def get_device_service(session: SessionDep) -> DeviceService:
    return DeviceService(session)


async def get_dashboard_service(session: SessionDep) -> DashboardService:
    return DashboardService(session)


MetricsServiceDep = Annotated[MetricsService, Depends(get_metrics_service)]
HostServiceDep = Annotated[HostService, Depends(get_host_service)]
DeviceServiceDep = Annotated[DeviceService, Depends(get_device_service)]
DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]
