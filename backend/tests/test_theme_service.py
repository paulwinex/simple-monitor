"""ThemeService tests on in-memory SQLite (no live DB required)."""

import time

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.persistence.models import Base, Theme
from app.services.theme_service import (
    ThemeIdMismatch,
    ThemeImmutable,
    ThemeNotFound,
    ThemeService,
)
from tests.theme_fixtures import make_theme_payload

PRESET_IDS = ("light", "dark", "midnight", "nord")


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as db_session:
        yield db_session
    await engine.dispose()


@pytest_asyncio.fixture
async def service(session):
    return ThemeService(session)


# --------------------------------------------------------------------------- #
# Seeding
# --------------------------------------------------------------------------- #

async def test_list_is_empty_before_seeding(service):
    assert await service.list_themes() == []


async def test_ensure_presets_seeds_all_builtins(service):
    created = await service.ensure_presets()
    assert created == len(PRESET_IDS)

    ids = [t.id for t in await service.list_themes()]
    assert set(ids) == set(PRESET_IDS)


async def test_seeded_presets_are_flagged_builtin(service):
    await service.ensure_presets()
    for theme in await service.list_themes():
        assert theme.is_builtin is True


async def test_ensure_presets_is_idempotent(service):
    await service.ensure_presets()
    assert await service.ensure_presets() == 0
    assert len(await service.list_themes()) == len(PRESET_IDS)


async def test_ensure_presets_does_not_run_on_a_populated_table(service):
    # A user theme already exists, so the table is not empty and the presets
    # must not be force-reinserted on top of it.
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    assert await service.ensure_presets() == 0
    assert [t.id for t in await service.list_themes()] == ["mine"]


async def test_seeded_preset_documents_survive_validation(service):
    await service.ensure_presets()
    doc = await service.get_theme("midnight")
    assert doc.payload.header.background.type == "linear"
    assert len(doc.payload.header.background.stops) == 2


# --------------------------------------------------------------------------- #
# Listing and reading
# --------------------------------------------------------------------------- #

async def test_list_returns_summaries_without_documents(service):
    await service.ensure_presets()
    summaries = await service.list_themes()
    # Built-ins first, then by name.
    assert [s.id for s in summaries] == ["dark", "light", "midnight", "nord"]


async def test_user_themes_sort_after_builtins_alphabetically(service):
    await service.ensure_presets()
    await service.create_theme("Zebra", make_theme_payload("zebra", "Zebra"))
    await service.create_theme("Amber", make_theme_payload("amber", "Amber"))

    assert [s.id for s in await service.list_themes()] == [
        "dark", "light", "midnight", "nord", "amber", "zebra"
    ]


async def test_get_returns_the_full_document(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    doc = await service.get_theme("mine")

    assert doc.id == "mine"
    assert doc.name == "Mine"
    assert doc.is_builtin is False
    assert doc.payload.palette.widgetBackground == "#161b22"


async def test_get_missing_raises_not_found(service):
    with pytest.raises(ThemeNotFound):
        await service.get_theme("nope")


# --------------------------------------------------------------------------- #
# Creating
# --------------------------------------------------------------------------- #

async def test_create_slugifies_the_name(service):
    doc = await service.create_theme("My Cool Theme", make_theme_payload("x", "x"))
    assert doc.id == "my-cool-theme"


async def test_create_strips_emoji_and_collapses_dashes(service):
    doc = await service.create_theme("  spaced   out  ", make_theme_payload("x", "x"))
    assert doc.id == "spaced-out"


async def test_create_deduplicates_colliding_slugs(service):
    first = await service.create_theme("My Theme", make_theme_payload("x", "x"))
    second = await service.create_theme("my theme", make_theme_payload("x", "x"))
    third = await service.create_theme("My  Theme!", make_theme_payload("x", "x"))

    assert first.id == "my-theme"
    assert second.id == "my-theme-2"
    assert third.id == "my-theme-3"


async def test_create_ignores_the_payload_id_and_uses_the_slug(service):
    # The server owns the id; a stale client id must not leak into the row.
    doc = await service.create_theme("Mine", make_theme_payload("client-chosen", "Client"))
    assert doc.id == "mine"
    assert doc.payload.id == "mine"


async def test_create_rejects_a_name_that_slugs_to_nothing(service):
    with pytest.raises(ValueError):
        await service.create_theme("!!!", make_theme_payload("x", "x"))


async def test_create_transliterates_a_cyrillic_name(service):
    # The UI is Russian-facing, and the id column is ASCII-only, so the name
    # has to be transliterated rather than rejected.
    doc = await service.create_theme("Ночная Тема", make_theme_payload("x", "x"))
    assert doc.id == "nochnaya-tema"
    assert doc.name == "Ночная Тема"


async def test_create_transliterates_every_letter(service):
    doc = await service.create_theme("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", make_theme_payload("x", "x"))
    assert doc.id.isascii()
    assert set(doc.id) <= set("abcdefghijklmnopqrstuvwxyz-")


async def test_create_keeps_cyrillic_in_the_display_name(service):
    doc = await service.create_theme("Тема", make_theme_payload("x", "x"))
    assert doc.name == "Тема"
    assert (await service.get_theme("tema")).name == "Тема"


async def test_create_dedupes_transliterated_collisions(service):
    first = await service.create_theme("Ночь", make_theme_payload("x", "x"))
    second = await service.create_theme("ночь", make_theme_payload("x", "x"))
    assert first.id == "noch"
    assert second.id == "noch-2"


async def test_create_mixes_latin_and_cyrillic(service):
    doc = await service.create_theme("Pro Тема", make_theme_payload("x", "x"))
    assert doc.id == "pro-tema"


async def test_create_sets_timestamps(service):
    before = int(time.time())
    doc = await service.create_theme("Mine", make_theme_payload("x", "x"))
    after = int(time.time())

    assert doc.created_at >= before
    assert doc.updated_at >= before
    assert doc.updated_at <= after


async def test_create_is_not_builtin(service):
    doc = await service.create_theme("Mine", make_theme_payload("x", "x"))
    assert doc.is_builtin is False


# --------------------------------------------------------------------------- #
# Updating
# --------------------------------------------------------------------------- #

async def test_update_replaces_name_and_payload(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    updated = await service.update_theme(
        "mine", "Renamed", make_theme_payload("mine", "Renamed")
    )

    assert updated.id == "mine"
    assert updated.name == "Renamed"
    assert updated.payload.palette.appBackground == "#0d1117"


async def test_update_bumps_updated_at(service, session):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    first = (await service.get_theme("mine")).updated_at

    row = await session.get(Theme, "mine")
    row.updated_at = first - 100
    await session.commit()

    updated = await service.update_theme(
        "mine", "Mine", make_theme_payload("mine", "Mine")
    )
    assert updated.updated_at >= first


async def test_update_keeps_the_id_when_only_the_name_changes(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    updated = await service.update_theme(
        "mine", "Totally Different Name", make_theme_payload("mine", "Mine")
    )
    # Dashboards reference the id, so a rename must not move it.
    assert updated.id == "mine"


async def test_update_missing_raises_not_found(service):
    with pytest.raises(ThemeNotFound):
        await service.update_theme("nope", "X", make_theme_payload("nope", "X"))


async def test_update_rejects_a_payload_whose_id_differs(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    with pytest.raises(ThemeIdMismatch):
        await service.update_theme("mine", "Mine", make_theme_payload("other", "Mine"))


async def test_update_allows_editing_a_builtin(service):
    await service.ensure_presets()
    payload = make_theme_payload("light", "Light")
    payload["palette"]["appBackground"] = "#fefefe"
    updated = await service.update_theme("light", "Light", payload)

    assert updated.payload.palette.appBackground == "#fefefe"
    assert updated.is_builtin is True


# --------------------------------------------------------------------------- #
# Deleting
# --------------------------------------------------------------------------- #

async def test_delete_removes_the_theme(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    result = await service.delete_theme("mine")

    assert result.deleted_id == "mine"
    assert result.themes_remaining == 0
    with pytest.raises(ThemeNotFound):
        await service.get_theme("mine")


async def test_delete_reports_the_remaining_count(service):
    await service.ensure_presets()
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    result = await service.delete_theme("mine")
    assert result.themes_remaining == len(PRESET_IDS)


async def test_delete_missing_raises_not_found(service):
    with pytest.raises(ThemeNotFound):
        await service.delete_theme("nope")


async def test_delete_builtin_is_refused(service):
    await service.ensure_presets()
    with pytest.raises(ThemeImmutable):
        await service.delete_theme("light")


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #

async def test_export_returns_the_document(service):
    await service.create_theme("Mine", make_theme_payload("mine", "Mine"))
    exported = await service.export_theme("mine")

    assert exported["id"] == "mine"
    assert exported["name"] == "Mine"
    assert exported["payload"]["version"] == 1
    assert exported["payload"]["palette"]["appBackground"] == "#0d1117"


async def test_export_missing_raises_not_found(service):
    with pytest.raises(ThemeNotFound):
        await service.export_theme("nope")


async def test_export_of_a_builtin_matches_the_seed(service):
    await service.ensure_presets()
    seeded = (await service.get_theme("midnight")).payload
    exported = await service.export_theme("midnight")
    assert exported["payload"] == seeded.model_dump(mode="json")
