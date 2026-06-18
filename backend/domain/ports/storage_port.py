from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Sequence


class StoragePort(ABC):
    @abstractmethod
    def upload(self, key: str, data: BinaryIO | bytes | Path) -> None:
        raise NotImplementedError

    @abstractmethod
    def download(self, key: str, target: BinaryIO | Path) -> None:
        raise NotImplementedError

    @abstractmethod
    def exists(self, key: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def delete(self, key: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        raise NotImplementedError

    @abstractmethod
    def list(self, prefix: str = "") -> Sequence[str]:
        raise NotImplementedError
