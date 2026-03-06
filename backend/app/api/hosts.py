from fastapi import APIRouter, HTTPException

from app.api.deps import HostServiceDep
from app.api.dto import (
    HostRegisterRequest, HostRegisterResponse,
    HostConfigResponse, ConfigVersionResponse,
    HostConfigUpdateRequest
)


router = APIRouter(prefix="/hosts", tags=["hosts"])


@router.post("/register", response_model=HostRegisterResponse)
async def register_host(
    payload: HostRegisterRequest,
    service: HostServiceDep
):
    """Register a new host or update existing one."""
    await service.register_host(payload.host_id, payload.collectors)
    return HostRegisterResponse(host_id=payload.host_id, registered=True)


@router.get("/{host_id}/config", response_model=HostConfigResponse)
async def get_host_config(
    host_id: str,
    service: HostServiceDep
):
    """Get full configuration for a host."""
    config = await service.get_host_config(host_id)
    if not config:
        return HostConfigResponse(host_id=host_id, version=0, collectors={})
    return HostConfigResponse(
        host_id=host_id,
        version=config.version,
        collectors=config.config
    )


@router.get("/{host_id}/config/version", response_model=ConfigVersionResponse)
async def get_config_version(
    host_id: str,
    service: HostServiceDep
):
    """Get configuration version for change detection."""
    version = await service.get_config_version(host_id)
    return ConfigVersionResponse(version=version)


@router.put("/{host_id}/config", response_model=HostConfigResponse)
async def update_host_config(
    host_id: str,
    payload: HostConfigUpdateRequest,
    service: HostServiceDep
):
    """Update host configuration (called by frontend dashboard)."""
    if not await service.host_exists(host_id):
        raise HTTPException(status_code=404, detail="Host not found")
    
    config = await service.update_host_config(host_id, payload.collectors)
    return HostConfigResponse(
        host_id=host_id,
        version=config.version,
        collectors=config.config
    )
