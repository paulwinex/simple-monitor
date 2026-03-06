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
