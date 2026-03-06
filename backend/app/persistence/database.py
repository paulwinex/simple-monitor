from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from contextlib import asynccontextmanager

from app.persistence.models import Base


def create_engine(database_url: str):
    """Create async engine for PostgreSQL."""
    engine = create_async_engine(
        database_url,
        echo=False,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
    )
    return engine


def create_session_factory(engine):
    """Create async session factory."""
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )


# Global session factory - will be initialized in main.py
_session_factory: async_sessionmaker | None = None


async def init_db(database_url: str):
    """Initialize database - create tables and set up session factory."""
    global _session_factory
    
    engine = create_engine(database_url)
    _session_factory = create_session_factory(engine)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    return engine


async def get_session() -> AsyncSession:
    """Get async session - use with 'async with'."""
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    
    async with _session_factory() as session:
        yield session


@asynccontextmanager
async def get_session_context() -> AsyncSession:
    """Get async session as context manager."""
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    
    async with _session_factory() as session:
        yield session
