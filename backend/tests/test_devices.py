import time
import pytest
import pytest_asyncio
from fastapi import status
from httpx import AsyncClient


class TestDevicesAPI:
    @pytest_asyncio.fixture
    async def host_with_devices(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-devices",
            "collectors": ["cpu", "ram"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        now = int(time.time())
        metrics_payload = {
            "host_id": "test-host-devices",
            "metrics": [
                {
                    "device_id": "cpu0",
                    "device_type": "cpu",
                    "name": "usage_percent",
                    "timestamp": now,
                    "value": 45
                },
                {
                    "device_id": "ssd0",
                    "device_type": "ssd",
                    "name": "temperature",
                    "timestamp": now,
                    "value": 35
                }
            ]
        }
        await client.post("/api/v1/metrics/ingest", json=metrics_payload)

        return "test-host-devices"

    @pytest.mark.asyncio
    async def test_list_host_devices(self, client: AsyncClient, host_with_devices):
        resp = await client.get(f"/api/v1/devices/{host_with_devices}")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Check device structure
        device = data[0]
        assert "id" in device
        assert "name" in device
        assert "type" in device
        assert "label" in device
        assert "enabled" in device

    @pytest.mark.asyncio
    async def test_get_device(self, client: AsyncClient, host_with_devices):
        resp = await client.get(f"/api/v1/devices/{host_with_devices}/cpu0")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["name"] == "cpu0"
        assert data["type"] == "cpu"
        assert "label" in data
        assert "enabled" in data
        assert "details" in data

    @pytest.mark.asyncio
    async def test_get_device_not_found(self, client: AsyncClient, host_with_devices):
        resp = await client.get(f"/api/v1/devices/{host_with_devices}/non-existent")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        data = resp.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_delete_device(self, client: AsyncClient, host_with_devices):
        resp = await client.delete(f"/api/v1/devices/{host_with_devices}/ssd0")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["deleted"] is True

        resp = await client.get(f"/api/v1/devices/{host_with_devices}/ssd0")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_device_not_found(self, client: AsyncClient, host_with_devices):
        resp = await client.delete(f"/api/v1/devices/{host_with_devices}/non-existent")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        data = resp.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_list_devices_empty_host(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-empty-devices",
            "collectors": ["cpu"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        resp = await client.get("/api/v1/devices/test-host-empty-devices")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_device_has_details(self, client: AsyncClient, host_with_devices):
        resp = await client.get(f"/api/v1/devices/{host_with_devices}/cpu0")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "details" in data
        assert isinstance(data["details"], dict)
