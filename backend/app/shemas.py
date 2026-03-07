from enum import StrEnum, auto

from pydantic import BaseModel


class Table(StrEnum):
    raw = auto()
    hourly = auto()
    history = auto()


class MetricIngestRequest(BaseModel):
    device_id: str
    device_type: str
    name: str
    timestamp: int
    value: int


class BatchIngestRequest(BaseModel):
    host_id: str
    metrics: list[MetricIngestRequest]


class MetricOut(BaseModel):
    timestamp: int
    value: float


class DeviceInfo(BaseModel):
    name: str
    type: str
    label: str
    metrics: list[str]


class HostRegisterRequest(BaseModel):
    host_id: str
    collectors: list[str]


class HostRegisterResponse(BaseModel):
    host_id: str
    registered: bool


class HostConfigResponse(BaseModel):
    host_id: str
    version: int
    collectors: dict = {}


class ConfigVersionResponse(BaseModel):
    version: int


class HostConfigUpdateRequest(BaseModel):
    collectors: dict[str, dict]


class IngestResponse(BaseModel):
    inserted: int


class MetricQueryParams(BaseModel):
    host_id: str
    device_id: str
    name: str
    start_ts: int
    end_ts: int
    table: Table =Table.raw
    limit: int = 1000


class DeviceOut(BaseModel):
    name: str
    type: str
    label: str
    enabled: bool
    details: dict = {}


class HostWithDevicesOut(BaseModel):
    host_id: str
    registered_at: int
    last_seen: int
    devices: list[DeviceOut|dict]


# =============================================================================
# Dashboard Schemas
# =============================================================================

class WidgetSensorConfig(BaseModel):
    """Sensor configuration for a widget."""
    name: str
    table: Table = Table.raw


class WidgetConfig(BaseModel):
    """Widget configuration."""
    id: str
    type: str
    title: str
    host_id: str
    device_id: str
    sensors: list[WidgetSensorConfig]
    options: dict = {}
    refresh_interval: int = 5000  # ms


class GridLayoutItem(BaseModel):
    """Grid layout item for vue-grid-layout."""
    i: str  # widget id
    x: int
    y: int
    w: int
    h: int
    min_w: int = 2
    min_h: int = 2
    max_w: int = 12
    max_h: int = 24
    static: bool = False


class DashboardConfig(BaseModel):
    """Dashboard configuration."""
    id: int | None = None  # Dashboard ID in database
    name: str = "My Dashboard"
    version: int = 1
    layout: list[GridLayoutItem] = []
    widgets: list[WidgetConfig] = []
    updated_at: int = 0


class DashboardGetResponse(BaseModel):
    """Dashboard get response."""
    id: int
    version: int
    dashboard: DashboardConfig


class DashboardSaveRequest(BaseModel):
    """Dashboard save request."""
    dashboard: DashboardConfig


class DashboardSaveResponse(BaseModel):
    """Dashboard save response."""
    id: int
    version: int
    saved: bool


# =============================================================================
# Batch Query Schemas
# =============================================================================

class MetricQueryRequest(BaseModel):
    """Single metric query request."""
    device_id: str
    name: str
    start_ts: int | None = None
    end_ts: int | None = None
    table: Table = Table.raw
    limit: int = 1000


class MetricQueryResult(BaseModel):
    """Single metric query result."""
    device_id: str
    name: str
    data: list[MetricOut]


class BatchQueryRequest(BaseModel):
    """Batch metrics query request."""
    host_id: str
    queries: list[MetricQueryRequest]


class BatchQueryResponse(BaseModel):
    """Batch metrics query response."""
    results: list[MetricQueryResult]


class LatestQueryRequest(BaseModel):
    """Single latest metric query request."""
    device_id: str
    name: str


class LatestQueryResult(BaseModel):
    """Single latest metric query result."""
    device_id: str
    name: str
    data: MetricOut | None


class BatchLatestRequest(BaseModel):
    """Batch latest metrics query request."""
    host_id: str
    queries: list[LatestQueryRequest]


class BatchLatestResponse(BaseModel):
    """Batch latest metrics query response."""
    results: list[LatestQueryResult]
