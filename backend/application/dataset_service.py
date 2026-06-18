from __future__ import annotations

from datetime import datetime, UTC
from pathlib import Path
from typing import BinaryIO, Sequence, Optional

from application.dto.requests import DownloadRequest
from application.dto.responses import DownloadResponse
from application.providers.provider import Provider
from domain.entities.climate_asset import ClimateAsset, ClimateAssetStatus
from domain.ports.dataset_repository import DatasetRepository
from domain.ports.storage_port import StoragePort


class DatasetService:
    def __init__(self, repository: DatasetRepository, storage: StoragePort, provider: Optional[Provider] = None):
        self.repository = repository
        self.storage = storage
        self.provider = provider

    async def download_and_register(
        self,
        request: DownloadRequest,
    ) -> ClimateAsset:
        """Download climate data via provider and register it."""
        if not self.provider:
            raise ValueError("No provider configured for DatasetService")

        # Download data from provider
        download_result = await self.provider.download(request)
        if not download_result.success or not download_result.file_path:
            raise ValueError(f"Download failed: {download_result.error_message}")

        # Register asset
        return await self.register_asset(
            provider=request.provider,
            variable=request.variable,
            year=request.year,
            month=request.month,
            file_path=download_result.file_path,
            file_size=download_result.file_size or 0,
            checksum=download_result.checksum or "",
        )

    async def register_asset(
        self,
        provider: str,
        variable: str,
        year: int,
        month: int,
        file_path: Path | BinaryIO,
        file_size: int,
        checksum: str,
    ) -> ClimateAsset:
        storage_key = f"{provider}/{variable}/{year}/{month:02d}.nc"
        
        if self.storage.exists(storage_key):
            raise ValueError(f"Asset already exists in storage: {storage_key}")

        if await self.repository.exists(provider, variable, year, month):
            raise ValueError(f"Asset already registered: {provider}/{variable}/{year}/{month:02d}")

        self.storage.upload(storage_key, file_path)

        asset = ClimateAsset(
            id=None,
            provider=provider,
            variable=variable,
            year=year,
            month=month,
            storage_key=storage_key,
            checksum=checksum,
            file_size=file_size,
            status=ClimateAssetStatus.COMPLETED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        return await self.repository.save(asset)

    async def get_asset(self, asset_id: str) -> ClimateAsset | None:
        return await self.repository.get_by_id(asset_id)

    async def list_assets(self) -> Sequence[ClimateAsset]:
        return await self.repository.list()

    async def delete_asset(self, asset_id: str) -> None:
        asset = await self.repository.get_by_id(asset_id)
        if asset:
            await self.repository.delete(asset_id)
            self.storage.delete(asset.storage_key)
