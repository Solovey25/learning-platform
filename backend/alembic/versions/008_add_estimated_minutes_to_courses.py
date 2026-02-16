"""add estimated_minutes to courses

Revision ID: 008_estimated_minutes
Revises: 007_assignments
Create Date: 2026-02-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "008_estimated_minutes"
down_revision = "007_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        'ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER'
    )


def downgrade() -> None:
    op.drop_column("courses", "estimated_minutes")
