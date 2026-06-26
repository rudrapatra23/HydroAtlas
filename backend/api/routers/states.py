from __future__ import annotations

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_repository, get_storage
from application.dto.requests import StatisticsRequest
from application.dto.responses import StateDistrictStatisticsResponse
from application.raster_computation import RasterComputation
from domain.ports.dataset_repository import DatasetRepository
from domain.ports.storage_port import StoragePort

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/states", tags=["states"])


async def get_raster_computation(
    repository: Annotated[DatasetRepository, Depends(get_repository)],
    storage: Annotated[StoragePort, Depends(get_storage)],
) -> RasterComputation:
    return RasterComputation(repository, storage)


@router.post("/{state_id}/districts/statistics", response_model=StateDistrictStatisticsResponse)
async def get_state_district_statistics(
    state_id: str,
    request: StatisticsRequest,
    computation: Annotated[RasterComputation, Depends(get_raster_computation)],
) -> StateDistrictStatisticsResponse:
    t_req = time.perf_counter()
    try:
        districts = await computation.compute_for_state(
            state_gid=state_id,
            year=request.year,
            month=request.month,
            variable=request.variable,
        )
        t_ser = time.perf_counter()
        response = StateDistrictStatisticsResponse(
            state_id=state_id,
            year=request.year,
            month=request.month,
            variable=request.variable,
            districts=districts,
        )
        t_end = time.perf_counter()
        logger.info("JSON serialization/response creation: %.3fs", t_end - t_ser)
        logger.info("Total request time: %.3fs", t_end - t_req)
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
