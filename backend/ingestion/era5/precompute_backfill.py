"""
backend/ingestion/era5/precompute_backfill.py

Orchestrator for backfilling district_monthly_statistics across a large
year range (e.g. 1950 -> present). Does NOT touch downloading -- it
assumes the (provider, variable, year, month) asset already exists in
climate_assets / S3 (per your existing ingestion task definition), and
only fills in precompute rows that are missing.

Reuses the exact same construction pattern as cli.py's
_run_precompute_one: a short-lived async_session_maker session for
lookups, and a dedicated NullPool engine for the long clipping+upsert
call (so an 8-10 minute precompute_one() doesn't leave a pooled asyncpg
connection idle long enough for Neon's reaper to kill it).

RESUMABILITY: before calling precompute_one for a given
(variable, year, month), this checks count_for_asset(asset.id). If rows
already exist, it's skipped. That means killing and re-running this
script naturally resumes from where it left off -- no separate
checkpoint file needed.

SHARDING FOR AWS: pass --start-year/--end-year/--variable to give each
parallel ECS task a distinct slice of the work. Because bulk_upsert uses
ON CONFLICT DO UPDATE, overlapping shards are safe (just wasteful, not
corrupting) if ranges ever accidentally overlap.

Usage:
    python -m ingestion.era5.precompute_backfill \
        --start-year 1950 --end-year 2026 \
        --variable precipitation \
        [--provider era5-land] [--force]

Run this 3x in parallel (one per variable) as a minimum starting point;
see the AWS notes at the bottom of this file for finer-grained sharding
by year range too.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import time
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from application.precompute_service import PrecomputeService
from application.raster_computation import RasterComputation, VARIABLE_MAP
from core.config import get_settings
from infrastructure.db.engine import build_asyncpg_url_and_connect_args
from infrastructure.db.session import async_session_maker
from infrastructure.repositories.postgres_dataset_repository import (
    PostgresDatasetRepository,
)
from infrastructure.repositories.postgres_district_monthly_statistics_repository import (
    PostgresDistrictMonthlyStatisticsRepository,
)
from infrastructure.storage.s3_storage_adapter import S3StorageAdapter

logger = logging.getLogger("ingestion.era5.precompute_backfill")


async def _already_done(asset_id: str) -> int:
    async with async_session_maker() as session:
        dms_repo = PostgresDistrictMonthlyStatisticsRepository(session)
        return await dms_repo.count_for_asset(asset_id)


async def _get_asset(provider: str, variable: str, year: int, month: int):
    async with async_session_maker() as session:
        repo = PostgresDatasetRepository(session)
        return await repo.get_by_period(
            year=year, month=month, provider=provider, variable=variable
        )


async def _precompute_one_isolated(provider: str, variable: str, year: int, month: int):
    """Mirrors cli.py's _run_precompute_one construction: a dedicated
    NullPool engine so the long clipping loop doesn't sit on a pooled
    connection Neon might reap.
    """
    async with async_session_maker() as session:
        repository = PostgresDatasetRepository(session)
        storage = S3StorageAdapter()
        raster_computation = RasterComputation(repository, storage)

        asyncpg_url, asyncpg_connect_args = build_asyncpg_url_and_connect_args()
        precompute_engine = create_async_engine(
            asyncpg_url, connect_args=asyncpg_connect_args, poolclass=NullPool,
        )
        precompute_session_maker = async_sessionmaker(
            precompute_engine, expire_on_commit=False,
        )
        try:
            service = PrecomputeService(
                session_factory=precompute_session_maker,
                storage=storage,
                raster_computation=raster_computation,
            )
            return await service.precompute_one(
                provider=provider, variable=variable, year=year, month=month,
            )
        finally:
            await precompute_engine.dispose()


async def run_backfill(
    *,
    provider: str,
    variables: list[str],
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
    force: bool,
) -> None:
    total = 0
    done = 0
    skipped_no_asset = 0
    skipped_already_done = 0
    failed = 0
    t_start = time.perf_counter()

    for variable in variables:
        y, m = start_year, start_month
        while (y, m) <= (end_year, end_month):
            total += 1
            asset = await _get_asset(provider, variable, y, m)
            if asset is None:
                logger.info(
                    "SKIP no_asset provider=%s variable=%s %04d-%02d "
                    "(not ingested yet)",
                    provider, variable, y, m,
                )
                skipped_no_asset += 1
                m += 1
                if m > 12:
                    m = 1
                    y += 1
                continue

            if not force:
                already = await _already_done(asset.id)
                if already > 0:
                    logger.info(
                        "SKIP already_done provider=%s variable=%s %04d-%02d rows=%d",
                        provider, variable, y, m, already,
                    )
                    skipped_already_done += 1
                    m += 1
                    if m > 12:
                        m = 1
                        y += 1
                    continue

            t_call = time.perf_counter()
            try:
                result = await _precompute_one_isolated(provider, variable, y, m)
                elapsed = time.perf_counter() - t_call
                done += 1
                logger.info(
                    "DONE provider=%s variable=%s %04d-%02d districts=%d "
                    "rows_upserted=%d call_seconds=%.1f progress=%d/%d "
                    "elapsed_total_min=%.1f",
                    provider, variable, y, m,
                    result.districts_processed, result.rows_upserted, elapsed,
                    done + skipped_no_asset + skipped_already_done + failed, total,
                    (time.perf_counter() - t_start) / 60.0,
                )
            except Exception:
                failed += 1
                logger.exception(
                    "FAILED provider=%s variable=%s %04d-%02d -- continuing "
                    "with next period",
                    provider, variable, y, m,
                )

            m += 1
            if m > 12:
                m = 1
                y += 1

    logger.info(
        "BACKFILL_COMPLETE provider=%s variables=%s range=%04d-%02d..%04d-%02d "
        "total_periods=%d done=%d skipped_no_asset=%d skipped_already_done=%d "
        "failed=%d total_minutes=%.1f",
        provider, variables, start_year, start_month, end_year, end_month,
        total, done, skipped_no_asset, skipped_already_done, failed,
        (time.perf_counter() - t_start) / 60.0,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", default="era5-land")
    parser.add_argument(
        "--variable", action="append", dest="variables",
        choices=list(VARIABLE_MAP.keys()),
        help="Repeatable. Omit to process all 3 variables.",
    )
    parser.add_argument(
        "--start-year", type=int, default=None,
        help="Required unless --recent-years is used.",
    )
    parser.add_argument("--start-month", type=int, default=1)
    parser.add_argument(
        "--end-year", type=int, default=None,
        help="Required unless --recent-years is used.",
    )
    parser.add_argument("--end-month", type=int, default=12)
    parser.add_argument(
        "--recent-years", type=int, default=None,
        help=(
            "Instead of explicit --start-year/--end-year, precompute a "
            "trailing window of N years ending this month -- mirrors "
            "ERA5_HISTORY_YEARS so this can chain directly after "
            "`python -m ingestion.era5.scheduler` with no date arithmetic "
            "in the caller. Overrides --start-year/--end-year if given."
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Recompute even if rows already exist for this asset.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    variables = args.variables or list(VARIABLE_MAP.keys())

    if args.recent_years is not None:
        now = datetime.now(timezone.utc)
        start_year = now.year - args.recent_years
        end_year = now.year
        start_month = 1
        end_month = 12
        logger.info(
            "Using --recent-years=%d -> range %04d-01 .. %04d-12 "
            "(mirrors ERA5_HISTORY_YEARS trailing-window sync behavior)",
            args.recent_years, start_year, end_year,
        )
    else:
        if args.start_year is None or args.end_year is None:
            parser.error(
                "either --recent-years, or both --start-year and --end-year, "
                "must be given"
            )
        start_year = args.start_year
        end_year = args.end_year
        start_month = args.start_month
        end_month = args.end_month

    get_settings()  # fail fast if settings/env are misconfigured

    asyncio.run(
        run_backfill(
            provider=args.provider,
            variables=variables,
            start_year=start_year,
            start_month=start_month,
            end_year=end_year,
            end_month=end_month,
            force=args.force,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


# ---------------------------------------------------------------------------
# AWS NOTES
#
# Per-period cost is ~8-10 min (clipping-dominated, CPU-bound -- rioxarray
# clip x ~800 districts). This is NOT sped up by concurrency within one
# process (numpy/rasterio clipping doesn't parallelize well under asyncio
# in a single process). Real speedup = more parallel ECS tasks, each
# running this script against a different, non-overlapping shard.
#
# Rough sizing: 76 years x 12 months x 3 variables = ~2,736 periods.
# At ~9 min/period sequential, that's ~410 hours (~17 days) on one task.
# Splitting across N parallel Fargate tasks divides that by N roughly
# linearly (CPU-bound work, no shared bottleneck between tasks other
# than Neon, which easily handles N short-lived connections).
#
# Suggested sharding: 3 variables x ~10 year-chunks each = 30 parallel
# tasks, e.g.:
#   task 1:  --variable precipitation --start-year 1950 --end-year 1957
#   task 2:  --variable precipitation --start-year 1958 --end-year 1965
#   ...
#   task 30: --variable surface_runoff --start-year 2019 --end-year 2026
# That gets total wall time down to roughly 410/30 ~= 14 hours.
#
# Register this as its own ECS Task Definition (reuse the existing
# backend image -- same Dockerfile, just a different `command`), then
# fire off N `aws ecs run-task` calls (or a small script/Step Function
# that generates the year-range args and calls run-task in a loop) --
# NOT as a Service, since this is a finite job that should exit, not
# stay running.
# ---------------------------------------------------------------------------