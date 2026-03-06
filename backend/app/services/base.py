from abc import ABC
from sqlalchemy.ext.asyncio import AsyncSession


class BaseService(ABC):
    """Base service class with async session."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
