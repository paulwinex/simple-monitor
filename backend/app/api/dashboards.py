from fastapi import APIRouter, HTTPException, Path

from app.api.deps import DashboardServiceDep
from app.shemas import (
    DashboardGetResponse,
    DashboardSaveRequest,
    DashboardSaveResponse,
    DashboardConfig,
)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("", response_model=list[DashboardConfig])
async def list_dashboards(service: DashboardServiceDep):
    """List all dashboards."""
    return await service.list_dashboards()


@router.get("/default", response_model=DashboardGetResponse)
async def get_default_dashboard(service: DashboardServiceDep):
    """Get the default dashboard (first one)."""
    dashboard = await service.get_dashboard(dashboard_id=1)

    if not dashboard:
        # Return empty dashboard if none exists
        dashboard = DashboardConfig()

    version = await service.get_dashboard_version(dashboard_id=1)

    return DashboardGetResponse(
        id=1,
        version=version,
        dashboard=dashboard
    )


@router.get("/{dashboard_id}", response_model=DashboardGetResponse)
async def get_dashboard(
    dashboard_id: int = Path(..., description="Dashboard ID"),
    service: DashboardServiceDep = None
):
    """Get dashboard configuration by ID."""
    dashboard = await service.get_dashboard(dashboard_id=dashboard_id)

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    version = await service.get_dashboard_version(dashboard_id=dashboard_id)

    return DashboardGetResponse(
        id=dashboard_id,
        version=version,
        dashboard=dashboard
    )


@router.put("/default", response_model=DashboardSaveResponse)
async def save_default_dashboard(
    payload: DashboardSaveRequest = None,
    service: DashboardServiceDep = None
):
    """Save default dashboard configuration."""
    try:
        # Set dashboard ID to 1 for default dashboard
        if payload.dashboard.id is None:
            payload.dashboard.id = 1

        dashboard, version = await service.save_dashboard(dashboard=payload.dashboard)

        return DashboardSaveResponse(
            id=dashboard.id,
            version=version,
            saved=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{dashboard_id}", response_model=DashboardSaveResponse)
async def save_dashboard(
    dashboard_id: int = Path(..., description="Dashboard ID"),
    payload: DashboardSaveRequest = None,
    service: DashboardServiceDep = None
):
    """Save dashboard configuration."""
    try:
        # Set dashboard ID from path if not set
        if payload.dashboard.id is None:
            payload.dashboard.id = dashboard_id

        dashboard, version = await service.save_dashboard(dashboard=payload.dashboard)

        return DashboardSaveResponse(
            id=dashboard.id,
            version=version,
            saved=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: int = Path(..., description="Dashboard ID"),
    service: DashboardServiceDep = None
):
    """Delete a dashboard."""
    deleted = await service.delete_dashboard(dashboard_id=dashboard_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    return {"deleted": True}
