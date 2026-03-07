from app.api.metrics import router as metrics_router
from app.api.hosts import router as hosts_router
from app.api.devices import router as devices_router
from app.api.dashboards import router as dashboards_router

__all__ = [
    "metrics_router",
    "hosts_router",
    "devices_router",
    "dashboards_router",
]
