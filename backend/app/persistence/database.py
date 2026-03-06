from typing import AsyncGenerator, Any

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
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
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def get_session() -> AsyncGenerator[Any, Any]:
    async with session_factory() as session:
        yield session


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[Any, Any]:
    async with session_factory() as session:
        yield session
