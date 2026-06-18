from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence, Tuple
from datetime import datetime

from application.dto.requests import BootstrapRequest, DownloadRequest
from application.dto.responses import DownloadResponse


class Provider(ABC):
    """Abstract interface for climate data providers."""

    @abstractmethod
    async def bootstrap(self, request: BootstrapRequest) -> None:
        """Initialize provider configuration.

        Args:
            request: Bootstrapping configuration.
        """
        raise NotImplementedError

    @abstractmethod
    async def download(self, request: DownloadRequest) -> DownloadResponse:
        """Download climate data.

        Args:
            request: Download parameters.

        Returns:
            Result of the download attempt.
        """
        raise NotImplementedError

    @abstractmethod
    async def status(self) -> dict:
        """Get current provider status.

        Returns:
            Status dictionary.
        """
        raise NotImplementedError

    @abstractmethod
    async def available_periods(self, variable: str) -> Sequence[Tuple[int, int]]:
        """List available (year, month) periods for a variable.

        Args:
            variable: Climate variable.

        Returns:
            List of (year, month) tuples.
        """
        raise NotImplementedError
