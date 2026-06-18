from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


@dataclass
class DownloadResponse:
    """Response for successful download."""
    success: bool
    file_path: Optional[Path] = None
    checksum: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None
