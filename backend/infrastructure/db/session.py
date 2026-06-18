from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from infrastructure.db.engine import get_engine

async_engine = get_engine()
async_session_maker = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
