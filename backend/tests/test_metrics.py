"""Tests for metrics API endpoints."""
import time
import pytest
from fastapi import status
from httpx import AsyncClient


class TestMetricsAPI:
    """Tests for metrics ingestion and querying endpoints."""

    @pytest.fixture
    def sample_metrics_payload(self):
        """Sample metrics payload for testing."""
        now = int(time.time())
        return {
            "host_id": "test-host-metrics",
            "metrics": [
                {
                    "device_id": "cpu0",
                    "device_type": "cpu",
                    "name": "usage_percent",
                    "timestamp": now,
                    "value": 45
                },
                {
                    "device_id": "cpu0",
                    "device_type": "cpu",
                    "name": "usage_percent",
                    "timestamp": now + 1,
                    "value": 50
                },
                {
                    "device_id": "ram0",
                    "device_type": "ram",
                    "name": "used_mb",
                    "timestamp": now,
                    "value": 4096
                }
            ]
        }

    @pytest.mark.asyncio
    async def test_ingest_metrics(self, client: AsyncClient, sample_metrics_payload):
        """Test metrics ingestion."""
        resp = await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["inserted"] == 3

    @pytest.mark.asyncio
    async def test_ingest_empty_metrics(self, client: AsyncClient):
        """Test ingesting empty metrics list."""
        payload = {
            "host_id": "test-host-empty",
            "metrics": []
        }
        resp = await client.post("/api/v1/metrics/ingest", json=payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["inserted"] == 0

    @pytest.mark.asyncio
    async def test_query_metrics(self, client: AsyncClient, sample_metrics_payload):
        """Test querying metrics."""
        # Ingest metrics first
        await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)

        now = int(time.time())
        # Query metrics
        params = {
            "host_id": "test-host-metrics",
            "device_id": "cpu0",
            "name": "usage_percent",
            "start_ts": now - 10,
            "end_ts": now + 10,
            "table": "raw",
            "limit": 100
        }
        resp = await client.get("/api/v1/metrics/query", params=params)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert "timestamp" in data[0]
        assert "value" in data[0]

    @pytest.mark.asyncio
    async def test_query_metrics_nonexistent_host(self, client: AsyncClient):
        """Test querying metrics for non-existent host."""
        now = int(time.time())
        params = {
            "host_id": "non-existent-host",
            "device_id": "cpu0",
            "name": "usage_percent",
            "start_ts": now - 10,
            "end_ts": now + 10,
            "table": "raw",
            "limit": 100
        }
        resp = await client.get("/api/v1/metrics/query", params=params)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data == []

    @pytest.mark.asyncio
    async def test_query_latest(self, client: AsyncClient, sample_metrics_payload):
        """Test querying latest metric value."""
        # Ingest metrics first
        await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)

        params = {
            "host_id": "test-host-metrics",
            "device_id": "cpu0",
            "name": "usage_percent"
        }
        resp = await client.get("/api/v1/metrics/query/latest", params=params)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data is not None
        assert "timestamp" in data
        assert "value" in data

    @pytest.mark.asyncio
    async def test_query_latest_nonexistent(self, client: AsyncClient):
        """Test querying latest metric for non-existent device."""
        params = {
            "host_id": "test-host-metrics",
            "device_id": "non-existent",
            "name": "usage_percent"
        }
        resp = await client.get("/api/v1/metrics/query/latest", params=params)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data is None

    @pytest.mark.asyncio
    async def test_list_devices(self, client: AsyncClient, sample_metrics_payload):
        """Test listing devices for a host."""
        # Ingest metrics first (creates devices)
        await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)

        params = {"host_id": "test-host-metrics"}
        resp = await client.get("/api/v1/metrics/devices", params=params)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        device = next((d for d in data if d["name"] == "cpu0"), None)
        assert device is not None
        assert "type" in device
        assert "label" in device
        assert "metrics" in device

    @pytest.mark.asyncio
    async def test_query_metrics_batch(self, client: AsyncClient, sample_metrics_payload):
        """Test batch metrics query."""
        # Ingest metrics first
        await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)

        now = int(time.time())
        payload = {
            "host_id": "test-host-metrics",
            "queries": [
                {
                    "device_id": "cpu0",
                    "name": "usage_percent",
                    "start_ts": now - 10,
                    "end_ts": now + 10,
                    "table": "raw",
                    "limit": 100
                },
                {
                    "device_id": "ram0",
                    "name": "used_mb",
                    "start_ts": now - 10,
                    "end_ts": now + 10,
                    "table": "raw",
                    "limit": 100
                }
            ]
        }
        resp = await client.post("/api/v1/metrics/query/batch", json=payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 2

    @pytest.mark.asyncio
    async def test_query_latest_batch(self, client: AsyncClient, sample_metrics_payload):
        """Test batch latest metrics query."""
        # Ingest metrics first
        await client.post("/api/v1/metrics/ingest", json=sample_metrics_payload)

        payload = {
            "host_id": "test-host-metrics",
            "queries": [
                {"device_id": "cpu0", "name": "usage_percent"},
                {"device_id": "ram0", "name": "used_mb"}
            ]
        }
        resp = await client.post("/api/v1/metrics/query/latest/batch", json=payload)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 2
        for result in data["results"]:
            assert "device_id" in result
            assert "name" in result
            assert "data" in result
