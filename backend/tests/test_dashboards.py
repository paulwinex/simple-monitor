import time
import pytest
from fastapi import status
from httpx import AsyncClient


class TestDashboardsAPI:

    @pytest.fixture
    def sample_dashboard_payload(self):
        return {
            "dashboard": {
                "id": 1,
                "name": "Test Dashboard",
                "version": 1,
                "layout": [
                    {
                        "i": "widget-1",
                        "x": 0,
                        "y": 0,
                        "w": 4,
                        "h": 6,
                        "min_w": 2,
                        "min_h": 2,
                        "max_w": 12,
                        "max_h": 24,
                        "static": False
                    }
                ],
                "widgets": [
                    {
                        "id": "widget-1",
                        "type": "line-chart",
                        "title": "CPU Usage",
                        "host_id": "test-host-001",
                        "device_id": "cpu0",
                        "sensors": [
                            {"name": "usage_percent", "table": "raw"}
                        ],
                        "options": {},
                        "refresh_interval": 5000
                    }
                ],
                "updated_at": int(time.time())
            }
        }

    @pytest.mark.asyncio
    async def test_list_dashboards_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboards")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_save_dashboard(self, client: AsyncClient, sample_dashboard_payload):
        resp = await client.put("/api/v1/dashboards/1", json=sample_dashboard_payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["id"] == 1
        assert data["saved"] is True
        assert "version" in data

    @pytest.mark.asyncio
    async def test_get_dashboard(self, client: AsyncClient, sample_dashboard_payload):
        await client.put("/api/v1/dashboards/1", json=sample_dashboard_payload)

        resp = await client.get("/api/v1/dashboards/1")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "id" in data
        assert "version" in data
        assert "dashboard" in data
        dashboard = data["dashboard"]
        assert dashboard["name"] == "Test Dashboard"
        assert "layout" in dashboard
        assert "widgets" in dashboard

    @pytest.mark.asyncio
    async def test_get_dashboard_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboards/999")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        data = resp.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_get_default_dashboard(self, client: AsyncClient, sample_dashboard_payload):
        await client.put("/api/v1/dashboards/1", json=sample_dashboard_payload)

        resp = await client.get("/api/v1/dashboards/default")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "id" in data
        assert "version" in data
        assert "dashboard" in data

    @pytest.mark.asyncio
    async def test_get_default_dashboard_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboards/default")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "id" in data
        assert "version" in data
        assert "dashboard" in data

    @pytest.mark.asyncio
    async def test_update_dashboard(self, client: AsyncClient, sample_dashboard_payload):
        await client.put("/api/v1/dashboards/1", json=sample_dashboard_payload)

        update_payload = {
            "dashboard": {
                "id": 1,
                "name": "Updated Dashboard",
                "version": 2,
                "layout": [],
                "widgets": [],
                "updated_at": int(time.time())
            }
        }
        resp = await client.put("/api/v1/dashboards/1", json=update_payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["id"] == 1
        assert data["saved"] is True

        resp = await client.get("/api/v1/dashboards/1")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["dashboard"]["name"] == "Updated Dashboard"

    @pytest.mark.asyncio
    async def test_delete_dashboard(self, client: AsyncClient, sample_dashboard_payload):
        await client.put("/api/v1/dashboards/1", json=sample_dashboard_payload)

        resp = await client.delete("/api/v1/dashboards/1")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["deleted"] is True

        resp = await client.get("/api/v1/dashboards/1")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_dashboard_not_found(self, client: AsyncClient):
        resp = await client.delete("/api/v1/dashboards/999")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        data = resp.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_dashboard_version_increment(self, client: AsyncClient):
        payload = {
            "dashboard": {
                "id": 1,
                "name": "Test Dashboard",
                "version": 1,
                "layout": [],
                "widgets": [],
                "updated_at": int(time.time())
            }
        }
        resp1 = await client.put("/api/v1/dashboards/1", json=payload)
        version1 = resp1.json()["version"]

        payload["dashboard"]["name"] = "Updated Name"
        resp2 = await client.put("/api/v1/dashboards/1", json=payload)
        version2 = resp2.json()["version"]

        assert version2 > version1

    @pytest.mark.asyncio
    async def test_list_dashboards(self, client: AsyncClient, sample_dashboard_payload):
        await client.put("/api/v1/dashboards/10", json=sample_dashboard_payload)

        payload2 = sample_dashboard_payload.copy()
        payload2["dashboard"]["id"] = 11
        payload2["dashboard"]["name"] = "Second Dashboard"
        await client.put("/api/v1/dashboards/11", json=payload2)

        resp = await client.get("/api/v1/dashboards")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 2
