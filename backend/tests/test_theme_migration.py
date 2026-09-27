"""Guards the themes migration against drift from the ORM model.

A migration that disagrees with models.py is invisible until a deploy: the
table exists with the wrong shape and only the failure is obvious. Comparing
the two here keeps that a test failure instead.
"""

import importlib.util
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect

from app.persistence.models import Theme

VERSIONS = Path(__file__).resolve().parent.parent / "alembic" / "versions"


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def migrated_inspector():
    """An in-memory database built by running every migration in order."""
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        context = MigrationContext.configure(conn)
        with Operations.context(context):
            for path in sorted(VERSIONS.glob("*.py")):
                _load(path, path.stem).upgrade()
    yield inspect(engine)
    engine.dispose()


def test_migration_creates_the_themes_table(migrated_inspector):
    assert "themes" in migrated_inspector.get_table_names()


def test_migrated_columns_match_the_orm(migrated_inspector):
    from_migration = {c["name"]: str(c["type"]) for c in migrated_inspector.get_columns("themes")}
    from_orm = {c.name: c.type.compile(dialect=migrated_inspector.bind.dialect)
                for c in Theme.__table__.columns}

    assert from_migration == from_orm


def test_migrated_primary_key_matches_the_orm(migrated_inspector):
    pk = migrated_inspector.get_pk_constraint("themes")["constrained_columns"]
    orm_pk = [c.name for c in Theme.__table__.primary_key.columns]
    assert pk == orm_pk == ["id"]


def test_migrated_indexes_match_the_orm(migrated_inspector):
    from_migration = {
        tuple(i["column_names"]) for i in migrated_inspector.get_indexes("themes")
    }
    from_orm = {
        tuple(i.columns.keys()) for i in Theme.__table__.indexes
    }
    assert from_migration == from_orm


def test_migrated_columns_are_not_nullable(migrated_inspector):
    nullable = {c["name"]: c["nullable"] for c in migrated_inspector.get_columns("themes")}
    assert all(value is False for value in nullable.values()), nullable


def test_downgrade_removes_only_the_themes_table():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        context = MigrationContext.configure(conn)
        with Operations.context(context):
            initial = _load(VERSIONS / "f2c0b0a15354_initial.py", "initial")
            themes = _load(VERSIONS / "a7d3e91c4b25_add_themes_table.py", "themes_migration")
            initial.upgrade()
            themes.upgrade()
            themes.downgrade()

    names = inspect(engine).get_table_names()
    assert "themes" not in names
    assert "dashboards" in names
    engine.dispose()
