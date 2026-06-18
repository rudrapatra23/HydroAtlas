from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class BootstrapRequest:
    """Request to bootstrap provider configuration."""
    config: Optional[dict] = None


@dataclass
class DownloadRequest:
    """Request to download climate data from a provider."""
    provider: str
    variable: str
    year: int
    month: int
    region: Optional[tuple[float, float, float, float]] = None  # (lat_min, lat_max, lon_min, lon_max)
