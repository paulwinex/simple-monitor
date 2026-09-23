from typing import AsyncGenerator, Any

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from contextlib import asynccontextmanager

from app.persistence.models import Base
from app.config import settings

engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
    )


session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def init_db():
    # temporary func
    async with engine.begin() as conn:
        print('Init database...', flush=True)
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight migrations for existing tables (create_all won't alter them)
        await conn.execute(
            text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS grid_options JSON DEFAULT '{}'::json")
        )
    return engine


async def get_session() -> AsyncGenerator[Any, Any]:
    async with session_factory() as session:
        yield session


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[Any, Any]:
    async with session_factory() as session:
        yield session
