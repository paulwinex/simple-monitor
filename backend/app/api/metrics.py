from fastapi import APIRouter, Query

from app.api.deps import MetricsServiceDep
from app.api.dto import BatchIngestRequest, IngestResponse
from app.services import MetricsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_metrics(
    payload: BatchIngestRequest,
    service: MetricsServiceDep
):
    """Ingest batch of metrics."""
    inserted = await service.ingest_metrics(payload)
    return IngestResponse(inserted=inserted)


@router.get("/query")
async def query_metrics(
    service: MetricsServiceDep,
    host_id: str = Query(...),
    device_id: str = Query(...),
    name: str = Query(...),
    start_ts: int = Query(...),
    end_ts: int = Query(...),
    table: str = Query("raw", description="raw, hourly, history, daily"),
    limit: int = Query(1000),
):
    """Query metrics in time range."""
    return await service.query_metrics(
        host_id=host_id,
        device_id=device_id,
        name=name,
        start_ts=start_ts,
        end_ts=end_ts,
        table=table,
        limit=limit
    )


@router.get("/query/latest")
async def query_latest(
    service: MetricsServiceDep,
    host_id: str = Query(...),
    device_id: str = Query(...),
    name: str = Query(...),
):
    """Get latest metric value."""
    return await service.query_latest(
        host_id=host_id,
        device_id=device_id,
        name=name
    )


@router.get("/devices")
async def list_devices(
    service: MetricsServiceDep,
    host_id: str = Query(...),
):
    """List all devices for a host."""
    return await service.list_devices(host_id)
