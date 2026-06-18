import pytest
from io import BytesIO

from application.dataset_service import DatasetService
from infrastructure.repositories.postgres_dataset_repository import PostgresDatasetRepository


@pytest.mark.asyncio
async def test_service_register_asset(in_memory_db_session, mock_storage_port, sample_climate_asset):
    repo = PostgresDatasetRepository(in_memory_db_session)
    service = DatasetService(repo, mock_storage_port)

    test_file = BytesIO(b"test data")
    registered = await service.register_asset(
        provider="era5",
        variable="temperature",
        year=2024,
        month=6,
        file_path=test_file,
        file_size=1024,
        checksum="abc123xyz",
    )

    assert registered.id is not None
    mock_storage_port.upload.assert_called_once()
