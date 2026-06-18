from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

from core.config import get_settings


def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=settings.environment == "development",
        pool_pre_ping=True,
    )
