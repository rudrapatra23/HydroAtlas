"""Process-wide lock guarding all netCDF4/HDF5 native file access.

netCDF4-python wraps the HDF5 C library, which is not thread-safe:
concurrent opens from separate OS threads, even of different files,
can corrupt HDF5's internal state and crash the whole process.

Every code path that opens a netCDF file (netCDF4.Dataset directly, or
xarray's netcdf4 engine) must acquire this lock for the duration of the
open call. It is a plain threading.Lock, not an asyncio.Lock, because it
must serialize across OS threads (e.g. a sync endpoint dispatched to a
thread-pool worker) as well as coroutines on the event loop.

This does not replace any per-key asyncio.Lock used elsewhere for
single-flight S3 download / open deduplication.
"""
from __future__ import annotations

import threading

NATIVE_IO_LOCK = threading.Lock()