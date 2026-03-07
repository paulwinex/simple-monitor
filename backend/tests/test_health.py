
import pytest
from fastapi import status
from httpx import AsyncClient


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {"status": "ok"}

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient):
        resp = await client.get("/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "Smart Monitor API" in data["name"]
        assert "version" in data
        assert "docs" in data
