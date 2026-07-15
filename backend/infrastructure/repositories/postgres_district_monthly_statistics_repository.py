"""PostgreSQL repository for ``district_monthly_statistics``.

Write methods are what the precompute service uses; read methods are
included so callers can query the table directly without going through
any router. The read methods match the index choices in the migration:
range queries hit the unique ``(provider, variable, gid_2, year, month)``
index or the secondary ``(provider, variable, gid_1, year, month)`` index.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Sequence

from sqlalchemy import delete, func, insert, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.db.district_monthly_statistics_model import (
    DistrictMonthlyStatisticsModel,
)


@dataclass(frozen=True, slots=True)
class DistrictMonthlyStatisticsRow:
    """Plain dataclass mirror of :class:`DistrictMonthlyStatisticsModel`.

    Frozen so the precompute service cannot accidentally mutate a row
    after it has been handed off to ``bulk_upsert``. ``computed_at`` is
    left to the database default (``now()``) and is not accepted from
    the caller.
    """

    provider: str
    variable: str
    gid_2: str
    gid_1: str
    year: int
    month: int
    pixel_count: int
    valid_pixel_count: int
    valid_pixel_pct: Decimal
    mean: float
    minimum: float
    maximum: float
    source_asset_id: str
    bbox: Sequence[float]


def _from_row(row: DistrictMonthlyStatisticsRow) -> dict[str, object]:
    """Convert a dataclass row to the dict shape ``bulk_upsert`` needs.

    ``bbox`` is stored as a list so PostgreSQL's JSONB encoder can
    serialise it; the dataclass keeps it as ``Sequence[float]`` to
    prevent callers from passing a dict.
    """
    return {
        "provider": row.provider,
        "variable": row.variable,
        "gid_2": row.gid_2,
        "gid_1": row.gid_1,
        "year": row.year,
        "month": row.month,
        "pixel_count": row.pixel_count,
        "valid_pixel_count": row.valid_pixel_count,
        "valid_pixel_pct": row.valid_pixel_pct,
        "mean": row.mean,
        "minimum": row.minimum,
        "maximum": row.maximum,
        "source_asset_id": row.source_asset_id,
        "bbox": list(row.bbox),
    }


def _to_domain(model: DistrictMonthlyStatisticsModel) -> DistrictMonthlyStatisticsRow:
    bbox = model.bbox if isinstance(model.bbox, list) else list(model.bbox)  # type: ignore[arg-type]
    return DistrictMonthlyStatisticsRow(
        provider=model.provider,
        variable=model.variable,
        gid_2=model.gid_2,
        gid_1=model.gid_1,
        year=model.year,
        month=model.month,
        pixel_count=model.pixel_count,
        valid_pixel_count=model.valid_pixel_count,
        valid_pixel_pct=model.valid_pixel_pct,
        mean=model.mean,
        minimum=model.minimum,
        maximum=model.maximum,
        source_asset_id=model.source_asset_id,
        bbox=tuple(bbox),
    )


class PostgresDistrictMonthlyStatisticsRepository:
    """Thin SQLAlchemy wrapper around the new table.

    Constructor signature mirrors
    :class:`PostgresDatasetRepository` so the dependency-injection layer
    in ``api/dependencies.py`` can build both repositories from the same
    async session.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def bulk_upsert(self, rows: Sequence[DistrictMonthlyStatisticsRow]) -> int:
        if not rows:
            return 0
        payload = [_from_row(r) for r in rows]
        stmt = pg_insert(DistrictMonthlyStatisticsModel).values(payload)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_dms_provider_variable_gid_year_month",
            set_={
                "pixel_count": stmt.excluded.pixel_count,
                "valid_pixel_count": stmt.excluded.valid_pixel_count,
                "valid_pixel_pct": stmt.excluded.valid_pixel_pct,
                "mean": stmt.excluded.mean,
                "minimum": stmt.excluded.minimum,
                "maximum": stmt.excluded.maximum,
                "source_asset_id": stmt.excluded.source_asset_id,
                "bbox": stmt.excluded.bbox,
                "computed_at": func.now(),
            },
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        # ``rowcount`` reflects the number of rows the database touched
        # (inserted + updated); ``len(rows)`` is the upper bound.
        return int(result.rowcount or 0)

    async def count_for_asset(self, source_asset_id: str) -> int:
        """Number of precomputed rows that reference ``source_asset_id``.
        """
        stmt = select(func.count(DistrictMonthlyStatisticsModel.id)).where(
            DistrictMonthlyStatisticsModel.source_asset_id == source_asset_id,
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def get_for_district(
        self,
        *,
        provider: str,
        variable: str,
        gid_2: str,
        year: int,
        month: int,
    ) -> DistrictMonthlyStatisticsRow | None:
        """Return one precomputed row or ``None``.

        Backed by the unique constraint — a single index seek.
        """
        stmt = select(DistrictMonthlyStatisticsModel).where(
            DistrictMonthlyStatisticsModel.provider == provider,
            DistrictMonthlyStatisticsModel.variable == variable,
            DistrictMonthlyStatisticsModel.gid_2 == gid_2,
            DistrictMonthlyStatisticsModel.year == year,
            DistrictMonthlyStatisticsModel.month == month,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return _to_domain(model)

    """
Add this method to PostgresDistrictMonthlyStatisticsRepository, right
after get_for_district. Also add `tuple_` to the sqlalchemy import at
the top of the file: from sqlalchemy import delete, func, insert,
select, tuple_, update
"""

    async def list_for_district_range(
        self,
        *,
        provider: str,
        variable: str,
        gid_2: str,
        start_year: int,
        start_month: int,
        end_year: int,
        end_month: int,
    ) -> list[DistrictMonthlyStatisticsRow]:
        """Return precomputed rows for one district over an inclusive
        [start, end] month range, in chronological order.

        Uses tuple_() for correct numeric (year, month) range comparison --
        matches the logic in _validate_range_against_inventory in
        districts.py, which does the same start_key/end_key comparison by
        hand in Python. This pushes it into the query instead.

        Backed by the (provider, variable, gid_2, year, month) unique index.
        """
        stmt = (
            select(DistrictMonthlyStatisticsModel)
            .where(
                DistrictMonthlyStatisticsModel.provider == provider,
                DistrictMonthlyStatisticsModel.variable == variable,
                DistrictMonthlyStatisticsModel.gid_2 == gid_2,
                tuple_(
                    DistrictMonthlyStatisticsModel.year,
                    DistrictMonthlyStatisticsModel.month,
                ) >= (start_year, start_month),
                tuple_(
                    DistrictMonthlyStatisticsModel.year,
                    DistrictMonthlyStatisticsModel.month,
                ) <= (end_year, end_month),
            )
            .order_by(
                DistrictMonthlyStatisticsModel.year,
                DistrictMonthlyStatisticsModel.month,
            )
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [_to_domain(m) for m in models]

    async def delete_for_asset(self, source_asset_id: str) -> int:
        """Delete every row referencing ``source_asset_id``.

        Useful when an asset is re-uploaded with a new id; the
        precompute command can call this before re-running. Returns the
        number of rows deleted.
        """
        stmt = delete(DistrictMonthlyStatisticsModel).where(
            DistrictMonthlyStatisticsModel.source_asset_id == source_asset_id,
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return int(result.rowcount or 0)
