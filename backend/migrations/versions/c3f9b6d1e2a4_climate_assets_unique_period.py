"""Deduplicate climate_assets and enforce one row per period."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f9b6d1e2a4"
down_revision: Union[str, Sequence[str], None] = "a7d3c1f04b9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY provider, variable, year, month
                        ORDER BY created_at DESC NULLS LAST, id DESC
                    ) AS row_num
                FROM climate_assets
            )
            DELETE FROM climate_assets AS asset
            USING ranked
            WHERE asset.id = ranked.id
              AND ranked.row_num > 1
            """
        )
    )
    op.create_unique_constraint(
        "uq_climate_assets_provider_variable_year_month",
        "climate_assets",
        ["provider", "variable", "year", "month"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_climate_assets_provider_variable_year_month",
        "climate_assets",
        type_="unique",
    )
