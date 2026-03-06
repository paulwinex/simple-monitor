from pydantic import BaseModel
from typing import Optional


class MetricIngestRequest(BaseModel):
    """Single metric for ingestion."""
    device_id: str
    device_type: str
    name: str
    timestamp: int
    value: int  # Always int for raw data


class BatchIngestRequest(BaseModel):
    """Batch of metrics for ingestion."""
    host_id: str
    metrics: list[MetricIngestRequest]


class MetricOut(BaseModel):
    """Metric output - timestamp and value."""
    timestamp: int
    value: float  # Can be float for resampled data


class DeviceInfo(BaseModel):
    """Device information for listing."""
    name: str
    type: str
    label: str
    metrics: list[str]


class HostRegisterRequest(BaseModel):
    """Host registration request."""
    host_id: str
    collectors: list[str]


class HostRegisterResponse(BaseModel):
    """Host registration response."""
    host_id: str
    registered: bool


class HostConfigResponse(BaseModel):
    """Host configuration response."""
    host_id: str
    version: int
    collectors: dict = {}


class ConfigVersionResponse(BaseModel):
    """Config version response."""
    version: int


class HostConfigUpdateRequest(BaseModel):
    """Host configuration update request."""
    collectors: dict[str, dict]


class IngestResponse(BaseModel):
    """Response for metric ingestion."""
    inserted: int


class MetricQueryParams(BaseModel):
    """Common query parameters for metrics."""
    host_id: str
    device_id: str
    name: str
    start_ts: int
    end_ts: int
    table: str = "raw"  # raw, hourly, history
    limit: int = 1000
