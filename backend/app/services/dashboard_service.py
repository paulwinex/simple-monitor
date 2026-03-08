import time
import json

from sqlalchemy import select

from app.services.base import BaseService
from app.persistence.models import Dashboard
from app.shemas import DashboardConfig, DashboardSaveRequest


class DashboardService(BaseService):
    """Service for dashboard management."""

    async def get_dashboard(self, dashboard_id: int = 1) -> DashboardConfig | None:
        """
        Get dashboard configuration.
        By default returns the first dashboard (id=1).
        """
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await self.session.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            return None

        # Convert JSON strings back to dicts if needed
        layout = dashboard.layout or {}
        widgets = dashboard.widgets or {}
        
        # Handle case when stored as list - convert to dict
        if isinstance(layout, list):
            layout = {item.get('i', str(idx)): item for idx, item in enumerate(layout)}
        if isinstance(widgets, list):
            widgets = {w.get('id', str(idx)): w for idx, w in enumerate(widgets)}

        return DashboardConfig(
            id=dashboard.id,
            name=dashboard.name,
            version=dashboard.version,
            layout=layout,
            widgets=widgets,
            updated_at=dashboard.updated_at
        )

    async def save_dashboard(
        self,
        dashboard: DashboardConfig
    ) -> tuple[DashboardConfig, int]:
        """
        Save dashboard configuration.
        Returns the saved dashboard and new version number.
        """
        now = int(time.time())

        # Get existing dashboard or create new one
        stmt = select(Dashboard).where(Dashboard.id == (dashboard.id or 1))
        result = await self.session.execute(stmt)
        db_dashboard = result.scalar_one_or_none()

        # Prepare dashboard data - layout and widgets are already dicts
        layout_data = dashboard.layout or {}
        widgets_data = dashboard.widgets or {}

        if db_dashboard:
            # Update existing dashboard
            db_dashboard.name = dashboard.name
            db_dashboard.layout = layout_data
            db_dashboard.widgets = widgets_data
            db_dashboard.version += 1
            db_dashboard.updated_at = now
        else:
            # Create new dashboard
            db_dashboard = Dashboard(
                id=dashboard.id or 1,
                name=dashboard.name,
                version=1,
                layout=layout_data,
                widgets=widgets_data,
                created_at=now,
                updated_at=now
            )
            self.session.add(db_dashboard)

        await self.session.commit()
        await self.session.refresh(db_dashboard)

        return DashboardConfig(
            id=db_dashboard.id,
            name=db_dashboard.name,
            version=db_dashboard.version,
            layout=db_dashboard.layout,
            widgets=db_dashboard.widgets,
            updated_at=db_dashboard.updated_at
        ), db_dashboard.version

    async def get_dashboard_version(self, dashboard_id: int = 1) -> int:
        """Get dashboard version."""
        stmt = select(Dashboard.version).where(Dashboard.id == dashboard_id)
        result = await self.session.execute(stmt)
        version = result.scalar_one_or_none()
        return version or 0

    async def delete_dashboard(self, dashboard_id: int) -> bool:
        """Delete a dashboard."""
        stmt = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await self.session.execute(stmt)
        dashboard = result.scalar_one_or_none()

        if not dashboard:
            return False

        await self.session.delete(dashboard)
        await self.session.commit()
        return True

    async def list_dashboards(self) -> list[DashboardConfig]:
        """List all dashboards."""
        stmt = select(Dashboard).order_by(Dashboard.id)
        result = await self.session.execute(stmt)
        dashboards = result.scalars().all()

        return [
            DashboardConfig(
                id=d.id,
                name=d.name,
                version=d.version,
                layout=d.layout or {},
                widgets=d.widgets or {},
                updated_at=d.updated_at
            )
            for d in dashboards
        ]
