from fastapi import APIRouter, HTTPException

from app.api.deps import DeviceServiceDep


router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("/{host_id}")
async def list_host_devices(
    host_id: str,
    service: DeviceServiceDep
):
    """List all devices for a host."""
    return await service.list_devices(host_id)


@router.get("/{host_id}/{device_id}")
async def get_device(
    host_id: str,
    device_id: str,
    service: DeviceServiceDep
):
    """Get a specific device."""
    device = await service.get_device(host_id, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.delete("/{host_id}/{device_id}")
async def delete_device(
    host_id: str,
    device_id: str,
    service: DeviceServiceDep
):
    """Delete a device and all its metrics."""
    deleted = await service.delete_device(host_id, device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"deleted": True}
