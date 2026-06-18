from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ClimateAssetStatus(Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class ClimateAsset:
    id: str | None
    provider: str
    variable: str
    year: int
    month: int
    storage_key: str
    checksum: str
    file_size: int
    status: ClimateAssetStatus
    created_at: datetime
    updated_at: datetime

    @property
    def period(self) -> str:
        return f"{self.year}-{self.month:02d}"

    @property
    def filename(self) -> str:
        return f"{self.provider}_{self.variable}_{self.year}_{self.month:02d}.nc"
