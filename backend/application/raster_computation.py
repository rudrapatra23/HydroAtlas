"""Geospatial computation for ERA5 climate data."""
from __future__ import annotations

from dataclasses import dataclass
import logging
from pathlib import Path
import time

import geopandas as gpd
import numpy as np
import rioxarray
import xarray as xr

from application.dto.responses import StateDistrictStatisticsItem
from domain.entities.climate_asset import ClimateAsset
from domain.ports.dataset_repository import DatasetRepository
from domain.ports.storage_port import StoragePort
from infrastructure.geospatial.boundary_loader import get_adm2

logger = logging.getLogger("uvicorn.error")


# Mapping from HydroAtlas variable names to ERA5 NetCDF variable names
VARIABLE_MAP = {
    "precipitation": "tp",
    "soil_moisture": "swvl1",
    "surface_runoff": "sro",
}


@dataclass
class RasterClipResult:
    """Result of clipping a raster to a district geometry."""
    pixel_count: int
    valid_pixel_count: int
    valid_pixel_percentage: float
    bounds: tuple[float, float, float, float]  # (min_x, min_y, max_x, max_y)
    mean: float
    minimum: float
    maximum: float


class RasterComputation:
    """Handles geospatial computations on ERA5 raster data."""

    def __init__(self, repository: DatasetRepository, storage: StoragePort):
        self.repository = repository
        self.storage = storage

    async def _load_monthly_raster(
        self,
        provider: str,
        year: int,
        month: int,
        variable: str,
    ) -> tuple[xr.Dataset | xr.DataArray, Path]:
        t0 = time.perf_counter()
        asset = await self.repository.get_by_period(year, month, provider, variable)
        t1 = time.perf_counter()
        logger.info("PostgreSQL asset lookup: %.3fs", t1 - t0)
        if not asset:
            raise ValueError(f"No dataset found for {provider}/{year}/{month:02d}")
        return self.read_raster_from_s3(asset)

    def _select_raster_variable(
        self,
        raster: xr.Dataset | xr.DataArray,
        variable: str,
    ) -> xr.DataArray:
        nc_var = VARIABLE_MAP.get(variable)
        if nc_var is None:
            raise ValueError(f"Unknown variable '{variable}'. Valid options: {list(VARIABLE_MAP.keys())}")

        if isinstance(raster, xr.DataArray):
            data = raster
            if data.name and data.name != nc_var:
                raise ValueError(
                    f"Variable '{nc_var}' not found in raster. Available: '{data.name}'"
                )
        else:
            if nc_var not in raster.data_vars:
                raise ValueError(f"Variable '{nc_var}' not found in NetCDF. Available: {list(raster.data_vars)}")
            data = raster[nc_var]

        if len(data.dims) == 3 and data.shape[0] == 1:
            data = data.isel({data.dims[0]: 0})

        return data

    def _compute_stats_for_geometry(
        self,
        data: xr.DataArray,
        geometry: gpd.GeoDataFrame,
    ) -> RasterClipResult:
        clipped = data.rio.clip(geometry.geometry.values, geometry.crs)
        bounds = clipped.rio.bounds()

        values = clipped.values
        total_pixels = values.size
        valid_mask = ~np.isnan(values)
        valid_pixel_count = int(valid_mask.sum())
        valid_pixel_percentage = (valid_pixel_count / total_pixels * 100) if total_pixels > 0 else 0.0

        valid_data = values[valid_mask]
        mean_value = float(np.mean(valid_data)) if valid_pixel_count > 0 else 0.0
        min_value = float(np.min(valid_data)) if valid_pixel_count > 0 else 0.0
        max_value = float(np.max(valid_data)) if valid_pixel_count > 0 else 0.0

        return RasterClipResult(
            pixel_count=int(total_pixels),
            valid_pixel_count=valid_pixel_count,
            valid_pixel_percentage=float(valid_pixel_percentage),
            bounds=bounds,
            mean=mean_value,
            minimum=min_value,
            maximum=max_value,
        )

    def get_district_geometry(self, district_gid: str) -> gpd.GeoDataFrame:
        """Load district geometry by GID_2 from GADM."""
        adm2 = get_adm2()
        district = adm2[adm2["GID_2"] == district_gid]
        if district.empty:
            raise ValueError(f"District not found: {district_gid}")
        return district

    def read_raster_from_s3(self, asset: ClimateAsset) -> tuple[xr.Dataset | xr.DataArray, Path]:
        """Download and open NetCDF from S3 as xarray Dataset.
        Returns tuple of (dataset, temp_path) - caller is responsible for cleanup."""
        import tempfile
        
        key = asset.storage_key
        logger.info("Downloading raster from storage: %s", key)
        
        with tempfile.NamedTemporaryFile(suffix='.nc', delete=False) as tmp:
            temp_path = Path(tmp.name)
        
        t0 = time.perf_counter()
        self.storage.download(key, temp_path)
        t1 = time.perf_counter()
        logger.info("Download from S3: %.3fs", t1 - t0)
        
        # Use xr.open_dataset so all variables (tp, swvl1, sro) are accessible
        t0 = time.perf_counter()
        rds = xr.open_dataset(temp_path, engine="netcdf4")
        t1 = time.perf_counter()
        logger.info("Open NetCDF with xarray: %.3fs", t1 - t0)
        logger.info("Opened raster file: %s  vars=%s", temp_path, list(rds.data_vars))
        
        # Assign CRS if not present (ERA5-Land is WGS84) so rio accessor works
        rds = rds.rio.write_crs("EPSG:4326")
        
        return rds, temp_path

    def clip_raster(
        self,
        raster: xr.Dataset | xr.DataArray,
        geometry: gpd.GeoDataFrame,
        variable: str,
    ) -> RasterClipResult:
        """Clip raster to district geometry and compute statistics for specified variable."""
        data = self._select_raster_variable(raster, variable)
        return self._compute_stats_for_geometry(data, geometry)

    async def compute_for_district(
        self,
        district_gid: str,
        provider: str = "era5-land",
        variable: str = "precipitation",
        year: int = 2024,
        month: int = 1,
    ) -> RasterClipResult:
        """Main entry point: compute raster stats for a district."""
        geometry = self.get_district_geometry(district_gid)
        
        raster, temp_path = await self._load_monthly_raster(provider=provider, year=year, month=month, variable=variable)
        
        try:
            data = self._select_raster_variable(raster, variable)
            return self._compute_stats_for_geometry(data, geometry)
        finally:
            # Clean up temp file - close dataset first
            raster.close()
            try:
                if temp_path.exists():
                    temp_path.unlink()
            except PermissionError:
                pass  # Windows may hold handle briefly

    async def compute_for_state(
        self,
        state_gid: str,
        provider: str = "era5-land",
        variable: str = "precipitation",
        year: int = 2024,
        month: int = 1,
    ) -> list[StateDistrictStatisticsItem]:
        t_total = time.perf_counter()

        t0 = time.perf_counter()
        adm2 = get_adm2()
        state_districts = adm2[adm2["GID_1"] == state_gid]
        if state_districts.empty:
            raise ValueError(f"State not found: {state_gid}")
        t1 = time.perf_counter()
        logger.info("Load/filter state district geometries: %.3fs", t1 - t0)

        raster, temp_path = await self._load_monthly_raster(provider=provider, year=year, month=month, variable=variable)

        try:
            try:
                raster_crs = raster.rio.crs
            except Exception:
                raster_crs = None

            if raster_crs and state_districts.crs and str(state_districts.crs) != str(raster_crs):
                state_districts = state_districts.to_crs(raster_crs)
            elif raster_crs and not state_districts.crs:
                state_districts = state_districts.set_crs(raster_crs)

            data = self._select_raster_variable(raster, variable)

            t_comp_start = time.perf_counter()
            results: list[StateDistrictStatisticsItem] = []
            for idx in state_districts.index:
                t_dist = time.perf_counter()
                district_id = str(state_districts.at[idx, "GID_2"])
                district_geometry = state_districts.loc[[idx]]
                try:
                    stats = self._compute_stats_for_geometry(data, district_geometry)
                    results.append(
                        StateDistrictStatisticsItem(
                            district_id=district_id,
                            mean=stats.mean,
                            min=stats.minimum,
                            max=stats.maximum,
                        )
                    )
                except Exception:
                    logger.exception("Failed computing stats for district %s in state %s", district_id, state_gid)
                    continue
                t_dist_end = time.perf_counter()
                logger.info("District %s: %.3fs", district_id, t_dist_end - t_dist)

            t_comp_end = time.perf_counter()
            logger.info("Compute statistics for all districts: %.3fs", t_comp_end - t_comp_start)

            logger.info(
                "State %s: districts returned=%d computed=%d",
                state_gid,
                len(state_districts),
                len(results),
            )
            for item in results[:5]:
                logger.info("State %s: %s mean=%s", state_gid, item.district_id, item.mean)
            means = [item.mean for item in results]
            if means:
                logger.info("State %s: mean range min=%s max=%s", state_gid, min(means), max(means))
            else:
                logger.info("State %s: mean range unavailable (no computed districts)", state_gid)

            t_total_end = time.perf_counter()
            logger.info("Total compute_for_state: %.3fs", t_total_end - t_total)

            return results
        finally:
            raster.close()
            try:
                if temp_path.exists():
                    temp_path.unlink()
            except PermissionError:
                pass
