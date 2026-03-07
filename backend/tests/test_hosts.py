import time
import pytest
from fastapi import status
from httpx import AsyncClient


class TestHostsAPI:
    @pytest.mark.asyncio
    async def test_register_host(self, client: AsyncClient):
        payload = {
            "host_id": "test-host-001",
            "collectors": ["cpu", "ram", "network"]
        }
        resp = await client.post("/api/v1/hosts/register", json=payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["host_id"] == "test-host-001"
        assert data["registered"] is True

    @pytest.mark.asyncio
    async def test_register_host_duplicate(self, client: AsyncClient):
        payload = {
            "host_id": "test-host-002",
            "collectors": ["cpu"]
        }
        resp1 = await client.post("/api/v1/hosts/register", json=payload)
        assert resp1.status_code == status.HTTP_200_OK

        resp2 = await client.post("/api/v1/hosts/register", json=payload)
        assert resp2.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_get_host_config(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-003",
            "collectors": ["cpu", "ram"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        resp = await client.get("/api/v1/hosts/test-host-003/config")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["host_id"] == "test-host-003"
        assert data["version"] >= 1
        assert "cpu" in data["collectors"]

    @pytest.mark.asyncio
    async def test_get_host_config_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/hosts/non-existent-host/config")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["version"] == 0
        assert data["collectors"] == {}

    @pytest.mark.asyncio
    async def test_get_config_version(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-004",
            "collectors": ["cpu"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        resp = await client.get("/api/v1/hosts/test-host-004/config/version")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "version" in data

    @pytest.mark.asyncio
    async def test_update_host_config(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-005",
            "collectors": ["cpu"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        update_payload = {
            "collectors": {
                "cpu": {"enabled": True, "interval_sec": 10},
                "ram": {"enabled": True, "interval_sec": 5}
            }
        }
        resp = await client.put(
            "/api/v1/hosts/test-host-005/config",
            json=update_payload
        )
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["version"] >= 1
        assert "ram" in data["collectors"]

    @pytest.mark.asyncio
    async def test_update_host_config_not_found(self, client: AsyncClient):
        update_payload = {
            "collectors": {"cpu": {"enabled": True}}
        }
        resp = await client.put(
            "/api/v1/hosts/non-existent-host/config",
            json=update_payload
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_list_hosts_with_devices(self, client: AsyncClient):
        register_payload = {
            "host_id": "test-host-006",
            "collectors": ["cpu", "ram"]
        }
        await client.post("/api/v1/hosts/register", json=register_payload)

        resp = await client.get("/api/v1/hosts")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)

        test_host = next((h for h in data if h["host_id"] == "test-host-006"), None)
        assert test_host is not None
        assert "registered_at" in test_host
        assert "last_seen" in test_host
        assert "devices" in test_host
