"""Theme REST API tests on in-memory SQLite (no live DB required)."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.themes import router as themes_router
from app.api.deps import get_theme_service
from app.persistence.models import Base
from app.services.theme_service import ThemeService
from tests.theme_fixtures import make_theme_payload


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
def session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def service(session_factory):
    async with session_factory() as session:
        yield ThemeService(session)


@pytest_asyncio.fixture
async def client(session_factory):
    from fastapi import FastAPI

    async def _override():
        async with session_factory() as session:
            yield ThemeService(session)

    app = FastAPI()
    app.include_router(themes_router, prefix="/api/v1")
    app.dependency_overrides[get_theme_service] = _override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


# --------------------------------------------------------------------------- #
# Routing
# --------------------------------------------------------------------------- #

async def test_schema_route_is_not_shadowed_by_the_id_route(client):
    # "/schema" has to be declared before "/{theme_id}" or FastAPI reads
    # "schema" as an id and answers 422.
    response = await client.get("/api/v1/themes/schema")
    assert response.status_code == 200


async def test_schema_route_returns_a_json_schema(client):
    body = (await client.get("/api/v1/themes/schema")).json()
    assert body["type"] == "object"
    assert "$defs" in body


async def test_schema_route_closes_the_document(client):
    body = (await client.get("/api/v1/themes/schema")).json()
    assert body["additionalProperties"] is False
    assert set(body["required"]) == {
        "id", "name", "version", "palette", "header", "border", "shadow", "font"
    }


# --------------------------------------------------------------------------- #
# List / read
# --------------------------------------------------------------------------- #

async def test_list_is_empty_initially(client):
    response = await client.get("/api/v1/themes")
    assert response.status_code == 200
    assert response.json() == []


async def test_get_missing_returns_404(client):
    response = await client.get("/api/v1/themes/nope")
    assert response.status_code == 404


async def test_get_returns_the_document(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    body = (await client.get("/api/v1/themes/mine")).json()

    assert body["id"] == "mine"
    assert body["name"] == "Mine"
    assert body["is_builtin"] is False
    assert body["payload"]["version"] == 1


# --------------------------------------------------------------------------- #
# Create
# --------------------------------------------------------------------------- #

async def test_create_returns_201_with_the_server_slug(client):
    response = await client.post(
        "/api/v1/themes", json={"name": "My Cool Theme", "payload": make_theme_payload("x", "x")}
    )
    assert response.status_code == 201
    assert response.json()["id"] == "my-cool-theme"


async def test_create_without_body_returns_422(client):
    assert (await client.post("/api/v1/themes")).status_code == 422


async def test_create_without_payload_returns_422(client):
    assert (await client.post("/api/v1/themes", json={"name": "X"})).status_code == 422


async def test_create_with_blank_name_returns_422(client):
    response = await client.post(
        "/api/v1/themes", json={"name": "   ", "payload": make_theme_payload("x", "x")}
    )
    assert response.status_code == 422


async def test_create_with_unknown_palette_key_returns_422(client):
    payload = make_theme_payload("x", "x")
    payload["palette"]["borderColor"] = "#fff"
    response = await client.post("/api/v1/themes", json={"name": "X", "payload": payload})
    assert response.status_code == 422


async def test_create_with_a_legacy_header_key_returns_422(client):
    payload = make_theme_payload("x", "x")
    payload["palette"]["widgetTitleColor"] = "#fff"
    response = await client.post("/api/v1/themes", json={"name": "X", "payload": payload})
    assert response.status_code == 422


async def test_create_with_six_gradient_stops_returns_422(client):
    payload = make_theme_payload("x", "x")
    payload["header"]["background"] = {
        "type": "linear", "angle": 180,
        "stops": [{"color": "#000000", "offset": n * 20} for n in range(6)],
    }
    response = await client.post("/api/v1/themes", json={"name": "X", "payload": payload})
    assert response.status_code == 422


async def test_create_dedupes_slugs(client):
    body = {"payload": make_theme_payload("x", "x")}
    first = await client.post("/api/v1/themes", json={**body, "name": "My Theme"})
    second = await client.post("/api/v1/themes", json={**body, "name": "my theme"})
    assert first.json()["id"] == "my-theme"
    assert second.json()["id"] == "my-theme-2"


# --------------------------------------------------------------------------- #
# Update
# --------------------------------------------------------------------------- #

async def test_update_replaces_the_document(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    payload = make_theme_payload("mine", "Mine")
    payload["palette"]["appBackground"] = "#010203"

    response = await client.put(
        "/api/v1/themes/mine", json={"name": "Renamed", "payload": payload}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"
    assert response.json()["payload"]["palette"]["appBackground"] == "#010203"


async def test_update_keeps_the_id_after_a_rename(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    response = await client.put(
        "/api/v1/themes/mine",
        json={"name": "Totally Different", "payload": make_theme_payload("mine", "Mine")},
    )
    assert response.json()["id"] == "mine"


async def test_update_missing_returns_404(client):
    payload = make_theme_payload("nope", "X")
    response = await client.put("/api/v1/themes/nope", json={"name": "X", "payload": payload})
    assert response.status_code == 404


async def test_update_without_body_returns_422(client):
    assert (await client.put("/api/v1/themes/mine")).status_code == 422


async def test_update_with_a_mismatched_payload_id_returns_422(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    response = await client.put(
        "/api/v1/themes/mine", json={"name": "Mine", "payload": make_theme_payload("other", "Mine")}
    )
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Delete
# --------------------------------------------------------------------------- #

async def test_delete_returns_the_remaining_count(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    response = await client.delete("/api/v1/themes/mine")
    assert response.status_code == 200
    assert response.json() == {"deleted_id": "mine", "themes_remaining": 0}


async def test_delete_missing_returns_404(client):
    assert (await client.delete("/api/v1/themes/nope")).status_code == 404


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #

async def test_export_returns_identity_plus_document(client):
    await client.post("/api/v1/themes", json={"name": "Mine", "payload": make_theme_payload("x", "x")})
    body = (await client.get("/api/v1/themes/mine/export")).json()

    assert body["id"] == "mine"
    assert body["name"] == "Mine"
    assert body["payload"]["version"] == 1


async def test_export_missing_returns_404(client):
    assert (await client.get("/api/v1/themes/nope/export")).status_code == 404


# --------------------------------------------------------------------------- #
# Seeded built-ins
# --------------------------------------------------------------------------- #

@pytest_asyncio.fixture
async def seeded_client(client, service):
    await service.ensure_presets()
    return client


async def test_seeded_builtins_are_listed(seeded_client):
    ids = [t["id"] for t in (await seeded_client.get("/api/v1/themes")).json()]
    assert set(ids) == {"light", "dark", "midnight", "nord"}


async def test_seeded_builtins_are_flagged(seeded_client):
    for theme in (await seeded_client.get("/api/v1/themes")).json():
        assert theme["is_builtin"] is True


async def test_deleting_a_builtin_returns_409(seeded_client):
    response = await seeded_client.delete("/api/v1/themes/light")
    assert response.status_code == 409


async def test_a_builtin_can_be_edited(seeded_client):
    payload = make_theme_payload("light", "Light")
    payload["palette"]["appBackground"] = "#fefefe"
    response = await seeded_client.put(
        "/api/v1/themes/light", json={"name": "Light", "payload": payload}
    )
    assert response.status_code == 200


async def test_all_seeded_builtins_round_trip_through_get(seeded_client):
    for theme_id in ("light", "dark", "midnight", "nord"):
        response = await seeded_client.get(f"/api/v1/themes/{theme_id}")
        assert response.status_code == 200, theme_id
        assert response.json()["payload"]["id"] == theme_id
