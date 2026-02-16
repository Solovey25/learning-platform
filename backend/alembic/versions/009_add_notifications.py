"""add notifications table

Revision ID: 009_add_notifications
Revises: 008_estimated_minutes
Create Date: 2026-02-16 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "009_add_notifications"
down_revision = "008_estimated_minutes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(text("SELECT to_regclass('public.notifications')")).scalar()

    if not table_exists:
        op.create_table(
            "notifications",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column("entity_type", sa.String(), nullable=True),
            sa.Column("entity_id", sa.String(), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )

        op.create_index(
            "ix_notifications_user_id_is_read_created_at",
            "notifications",
            ["user_id", "is_read", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(
        "ix_notifications_user_id_is_read_created_at",
        table_name="notifications",
    )
    op.drop_table("notifications")
