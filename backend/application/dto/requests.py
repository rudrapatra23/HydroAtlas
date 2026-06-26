from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StatisticsRequest:
    year: int
    month: int
    variable: str = "precipitation"
