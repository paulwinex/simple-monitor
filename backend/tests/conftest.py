from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.persistence import get_session
from app.persistence.models import Base
from app.config import Settings


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return Settings(
        DB_NAME="test",
        DB_USER="test",
        DB_PASSWORD="test",
        DB_HOST="sm-db-testing",
        DB_PORT=5432,
        HOST="0.0.0.0",
        PORT=8000,
        RESAMPLE_MINUTE_INTERVAL=60,
        RESAMPLE_HOURLY_INTERVAL=3600,
        RETENTION_RAW_DAYS=90,
        RETENTION_HOURLY_DAYS=365,
    )


@pytest_asyncio.fixture(scope="function")
async def async_db_session(test_settings: Settings) -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(
        test_settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        finally:
            await session.rollback()

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_app(
    async_db_session: AsyncSession,
    test_settings: Settings,
) -> AsyncGenerator[FastAPI, None]:
    from app.main import app

    async def get_test_session() -> AsyncGenerator[AsyncSession, None]:
        yield async_db_session

    app.dependency_overrides[get_session] = get_test_session

    yield app

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as http_client:
        yield http_client
