from __future__ import annotations

import asyncio
import logging
import os
import threading
from typing import Annotated

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import (
    get_district_clipper,
    get_repository,
    get_storage,
    get_dms_repository,
)
from application.diagnostics import flush, request_context
from application.dto.requests import StatisticsRequest
from application.dto.responses import (
    DistrictMonthlySeriesResponse,
    DistrictRasterClipResponse,
    MonthlySeriesPoint,
    StatisticsResponse,
)
from application.raster_computation import RasterComputation
from district_clip import DistrictNotFoundError, Era5DistrictClipper
from domain.ports.dataset_repository import DatasetRepository
from domain.ports.storage_port import StoragePort
from infrastructure.repositories.postgres_district_monthly_statistics_repository import (
    PostgresDistrictMonthlyStatisticsRepository,
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/districts", tags=["districts"])


async def get_raster_computation(
    repository: Annotated[DatasetRepository, Depends(get_repository)],
    storage: Annotated[StoragePort, Depends(get_storage)],
) -> RasterComputation:
    return RasterComputation(repository, storage)


# The fundamental time unit is one month. The frontend sends an inclusive
# ``[start, end]`` month range. Precomputed months are served straight from
# ``district_monthly_statistics``; any month in the range that isn't
# precomputed yet falls back to a live single-district, single-month clip,
# so the cost of a gap is proportional to the gap, not the whole request.
_NO_PERIOD_MESSAGE = "No climate data available for the selected period."


def _validate_range_against_inventory(
    request: StatisticsRequest,
    available: tuple[int, int, int, int] | None,
) -> None:
    """Reject requests whose month range falls outside the known inventory.

    Raises:
        HTTPException: 400 when the inventory is empty or the requested
            range starts before the earliest asset or ends after the
            latest asset.
    """
    if available is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_NO_PERIOD_MESSAGE,
        )
    min_year, min_month, max_year, max_month = available
    start_key = request.start_year * 12 + (request.start_month - 1)
    end_key = request.end_year * 12 + (request.end_month - 1)
    min_key = min_year * 12 + (min_month - 1)
    max_key = max_year * 12 + (max_month - 1)
    if start_key < min_key or end_key > max_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Selected month range falls outside the available dataset "
                f"range {min_year:04d}-{min_month:02d} to {max_year:04d}-{max_month:02d}."
            ),
        )


def _missing_months(
    have: set[tuple[int, int]],
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
) -> list[tuple[int, int]]:
    """(year, month) pairs in the inclusive range that aren't in `have`."""
    missing: list[tuple[int, int]] = []
    y, m = start_year, start_month
    while (y, m) <= (end_year, end_month):
        if (y, m) not in have:
            missing.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return missing


@router.post("/{district_id}/statistics", response_model=StatisticsResponse)
async def get_district_statistics(
    district_id: str,
    request: StatisticsRequest,
    computation: Annotated[RasterComputation, Depends(get_raster_computation)],
    dms_repo: Annotated[
        PostgresDistrictMonthlyStatisticsRepository, Depends(get_dms_repository)
    ],
) -> StatisticsResponse:
    """Get aggregated raster statistics for a district over a month range.

    Reads precomputed rows from district_monthly_statistics first; any
    month not yet precomputed is computed live (single district, single
    month) and folded into the aggregation, so the endpoint never
    depends on the full backfill being complete.
    """
    with request_context() as req_id:
        logger.info(
            "REQUEST_BEGIN endpoint=district_statistics request_id=%s "
            "district_id=%s variable=%s start=%04d-%02d end=%04d-%02d "
            "pid=%d thread_id=%d task_id=%s",
            req_id, district_id, request.variable,
            request.start_year, request.start_month,
            request.end_year, request.end_month,
            os.getpid(), threading.get_ident(), id(asyncio.current_task()),
        )
        flush()
        try:
            try:
                request.validate()
            except ValueError as exc:
                logger.info(
                    "REQUEST_ERROR endpoint=district_statistics request_id=%s "
                    "error=validation pid=%d thread_id=%d",
                    req_id, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                )

            available = await computation.repository.get_available_range(
                provider="era5-land",
                variable=request.variable,
            )
            _validate_range_against_inventory(request, available)

            dms_rows = await dms_repo.list_for_district_range(
                provider="era5-land",
                variable=request.variable,
                gid_2=district_id,
                start_year=request.start_year,
                start_month=request.start_month,
                end_year=request.end_year,
                end_month=request.end_month,
            )
            have = {(r.year, r.month) for r in dms_rows}
            per_month_means = [r.mean for r in dms_rows]
            per_month_mins = [r.minimum for r in dms_rows]
            per_month_maxes = [r.maximum for r in dms_rows]

            missing = _missing_months(
                have, request.start_year, request.start_month,
                request.end_year, request.end_month,
            )

            if missing:
                logger.info(
                    "REQUEST_INFO endpoint=district_statistics request_id=%s "
                    "district_id=%s variable=%s precomputed=%d missing=%d "
                    "-- falling back to live compute for missing months",
                    req_id, district_id, request.variable, len(dms_rows), len(missing),
                )
                flush()
                for (y, m) in missing:
                    try:
                        clip = await computation.compute_for_district(
                            district_gid=district_id,
                            provider="era5-land",
                            variable=request.variable,
                            year=y,
                            month=m,
                        )
                        per_month_means.append(clip.mean)
                        per_month_mins.append(clip.minimum)
                        per_month_maxes.append(clip.maximum)
                    except Exception:
                        logger.exception(
                            "REQUEST_ERROR endpoint=district_statistics request_id=%s "
                            "error=live_fallback_failed district_id=%s variable=%s "
                            "%04d-%02d",
                            req_id, district_id, request.variable, y, m,
                        )
                        flush()
                        continue

            if not per_month_means:
                logger.info(
                    "REQUEST_ERROR endpoint=district_statistics request_id=%s "
                    "error=no_period pid=%d thread_id=%d",
                    req_id, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=_NO_PERIOD_MESSAGE,
                )

            # Same reduction rule as the old RasterComputation._aggregate_for_geometry:
            # mean-of-means, min-of-mins, max-of-maxes.
            months_processed = len(per_month_means)
            mean_value = float(np.mean(per_month_means))
            min_value = float(np.min(per_month_mins))
            max_value = float(np.max(per_month_maxes))

            logger.info(
                "REQUEST_END endpoint=district_statistics request_id=%s "
                "district_id=%s months_processed=%d pid=%d thread_id=%d task_id=%s",
                req_id, district_id, months_processed,
                os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            return StatisticsResponse(
                district_id=district_id,
                variable=request.variable,
                start_year=request.start_year,
                start_month=request.start_month,
                end_year=request.end_year,
                end_month=request.end_month,
                months_processed=months_processed,
                mean=mean_value,
                min=min_value,
                max=max_value,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception(
                "REQUEST_ERROR endpoint=district_statistics request_id=%s "
                "error=unhandled pid=%d thread_id=%d task_id=%s",
                req_id, os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            raise


@router.post("/{district_id}/time-series", response_model=DistrictMonthlySeriesResponse)
async def get_district_time_series(
    district_id: str,
    request: StatisticsRequest,
    computation: Annotated[RasterComputation, Depends(get_raster_computation)],
    dms_repo: Annotated[
        PostgresDistrictMonthlyStatisticsRepository, Depends(get_dms_repository)
    ],
) -> DistrictMonthlySeriesResponse:
    """Get per-month raster statistics for a district over a month range.

    Reads precomputed rows from district_monthly_statistics first; any
    month not yet precomputed falls back to a live single-district,
    single-month clip so a gap costs proportional to the gap, not the
    whole request.

    The response is the natural primitive for the BottomPanel's Time
    Series, Trend, and Export tabs — each ``point`` carries the
    ``(year, month)`` anchor plus ``mean``/``min``/``max`` so the
    frontend can plot a clean chronological series, compute a regression
    line, or build a CSV without further round-trips.
    """
    with request_context() as req_id:
        logger.info(
            "REQUEST_BEGIN endpoint=district_time_series request_id=%s "
            "district_id=%s variable=%s start=%04d-%02d end=%04d-%02d "
            "pid=%d thread_id=%d task_id=%s",
            req_id, district_id, request.variable,
            request.start_year, request.start_month,
            request.end_year, request.end_month,
            os.getpid(), threading.get_ident(), id(asyncio.current_task()),
        )
        flush()
        try:
            try:
                request.validate()
            except ValueError as exc:
                logger.info(
                    "REQUEST_ERROR endpoint=district_time_series request_id=%s "
                    "error=validation pid=%d thread_id=%d",
                    req_id, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                )

            available = await computation.repository.get_available_range(
                provider="era5-land",
                variable=request.variable,
            )
            _validate_range_against_inventory(request, available)

            dms_rows = await dms_repo.list_for_district_range(
                provider="era5-land",
                variable=request.variable,
                gid_2=district_id,
                start_year=request.start_year,
                start_month=request.start_month,
                end_year=request.end_year,
                end_month=request.end_month,
            )
            have = {(r.year, r.month) for r in dms_rows}
            points: list[MonthlySeriesPoint] = [
                MonthlySeriesPoint(
                    year=r.year, month=r.month,
                    mean=r.mean, min=r.minimum, max=r.maximum,
                )
                for r in dms_rows
            ]

            missing = _missing_months(
                have, request.start_year, request.start_month,
                request.end_year, request.end_month,
            )

            if missing:
                logger.info(
                    "REQUEST_INFO endpoint=district_time_series request_id=%s "
                    "district_id=%s variable=%s precomputed=%d missing=%d "
                    "-- falling back to live compute for missing months",
                    req_id, district_id, request.variable, len(points), len(missing),
                )
                flush()
                for (y, m) in missing:
                    try:
                        clip = await computation.compute_for_district(
                            district_gid=district_id,
                            provider="era5-land",
                            variable=request.variable,
                            year=y,
                            month=m,
                        )
                        points.append(
                            MonthlySeriesPoint(
                                year=y, month=m,
                                mean=clip.mean, min=clip.minimum, max=clip.maximum,
                            )
                        )
                    except Exception:
                        logger.exception(
                            "REQUEST_ERROR endpoint=district_time_series request_id=%s "
                            "error=live_fallback_failed district_id=%s variable=%s "
                            "%04d-%02d",
                            req_id, district_id, request.variable, y, m,
                        )
                        flush()
                        continue

            points.sort(key=lambda p: (p.year, p.month))

            if not points:
                logger.info(
                    "REQUEST_ERROR endpoint=district_time_series request_id=%s "
                    "error=no_period pid=%d thread_id=%d",
                    req_id, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=_NO_PERIOD_MESSAGE,
                )

            logger.info(
                "REQUEST_END endpoint=district_time_series request_id=%s "
                "district_id=%s months_processed=%d pid=%d thread_id=%d task_id=%s",
                req_id, district_id, len(points),
                os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            return DistrictMonthlySeriesResponse(
                district_id=district_id,
                variable=request.variable,
                start_year=request.start_year,
                start_month=request.start_month,
                end_year=request.end_year,
                end_month=request.end_month,
                months_processed=len(points),
                points=points,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception(
                "REQUEST_ERROR endpoint=district_time_series request_id=%s "
                "error=unhandled pid=%d thread_id=%d task_id=%s",
                req_id, os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            raise


@router.get(
    "/{district_id}/raster-clip",
    response_model=DistrictRasterClipResponse,
    name="district_raster_clip",
)
async def get_district_raster_clip(
    district_id: str,
    clipper: Annotated[Era5DistrictClipper, Depends(get_district_clipper)],
    year: Annotated[int, Query(ge=1900, le=2100, description="ERA5 year (YYYY).")],
    month: Annotated[int, Query(ge=1, le=12, description="ERA5 month (1-12).")],
    variable: Annotated[
        str,
        Query(
            description=(
                "HydroAtlas public variable name. One of "
                "'precipitation', 'soil_moisture', 'surface_runoff'."
            ),
        ),
    ] = "precipitation",
    padding_deg: Annotated[
        float,
        Query(
            ge=0.0,
            le=2.0,
            description=(
                "Bbox padding in degrees added to the district polygon "
                "before the Stage-2 NetCDF read (Stage 1 I/O buffer)."
            ),
        ),
    ] = 0.1,
    provider: Annotated[
        str,
        Query(description="Climate data provider key."),
    ] = "era5-land",
) -> DistrictRasterClipResponse:
    """Return the per-cell ERA5 raster clipped to a GADM district boundary.

    The endpoint resolves the exact GADM geometry via the production
    boundary loader, fetches the (provider, variable, year, month)
    NetCDF through the existing S3-backed ``RasterCache``, performs
    the validated two-stage clip (bbox pre-filter + exact geometric
    clip in an LAEA equal-area projection), and returns the resulting
    clipped cells as a GeoJSON ``FeatureCollection`` plus summary
    statistics and operator-facing diagnostics.

    """
    with request_context() as req_id:
        logger.info(
            "REQUEST_BEGIN endpoint=district_raster_clip request_id=%s "
            "district_id=%s variable=%s year=%04d month=%02d padding_deg=%.3f "
            "provider=%s pid=%d thread_id=%d task_id=%s",
            req_id, district_id, variable, year, month, padding_deg, provider,
            os.getpid(), threading.get_ident(), id(asyncio.current_task()),
        )
        flush()
        try:
            try:
                result = await clipper.clip(
                    district_id=district_id,
                    year=year,
                    month=month,
                    variable=variable,
                    padding_deg=padding_deg,
                    provider=provider,
                )
            except DistrictNotFoundError as exc:
                logger.info(
                    "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                    "error=district_not_found pid=%d thread_id=%d",
                    req_id, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                )
            except KeyError as exc:
                logger.info(
                    "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                    "error=unknown_variable detail=%s pid=%d thread_id=%d",
                    req_id, exc, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                )
            except ValueError as exc:
                message = str(exc)
                logger.info(
                    "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                    "error=value_error detail=%s pid=%d thread_id=%d",
                    req_id, message, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=message,
                )
            except FileNotFoundError as exc:
                logger.error(
                    "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                    "error=netcdf_missing detail=%s pid=%d thread_id=%d",
                    req_id, exc, os.getpid(), threading.get_ident(),
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "NetCDF file is not available on disk and the S3 "
                        "download failed. Check the storage adapter and "
                        "the climate_assets row for this period."
                    ),
                )

            n_features = len(result.feature_collection.get("features", []))
            if n_features > clipper.max_features:
                logger.warning(
                    "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                    "error=too_many_features features=%d max=%d",
                    req_id, n_features, clipper.max_features,
                )
                flush()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"District yields {n_features} clipped cells, which "
                        f"exceeds the configured maximum of "
                        f"{clipper.max_features}. Re-run with a smaller "
                        "bbox padding or split the district."
                    ),
                )

            logger.info(
                "REQUEST_END endpoint=district_raster_clip request_id=%s "
                "district_id=%s variable=%s year=%04d month=%02d "
                "valid_cells=%d boundary_cells=%d "
                "asset=%s cache_hit=%s "
                "request_duration=%.3fs pid=%d thread_id=%d task_id=%s",
                req_id, district_id, variable, year, month,
                result.summary.get("valid_cells", 0),
                result.summary.get("boundary_cells", 0),
                result.asset_storage_key,
                result.cache_hit,
                result.diagnostics.get("request_duration_seconds", 0.0),
                os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            return DistrictRasterClipResponse.from_domain(result)
        except HTTPException:
            raise
        except Exception:
            logger.exception(
                "REQUEST_ERROR endpoint=district_raster_clip request_id=%s "
                "error=unhandled pid=%d thread_id=%d task_id=%s",
                req_id, os.getpid(), threading.get_ident(), id(asyncio.current_task()),
            )
            flush()
            raise