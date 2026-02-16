"""add default admin user

Revision ID: 005_add_admin_user
Revises: 004_seed_quizzes_progress
Create Date: 2026-02-15 02:00:00.000000

"""
from alembic import op
from sqlalchemy import text
from app.core.security import get_password_hash
import uuid


revision = "005_add_admin_user"
down_revision = "004_seed_quizzes_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    result = connection.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": "admin@admin.com"},
    )
    if result.scalar():
        return

    admin_id = str(uuid.uuid4())
    hashed_password = get_password_hash("admin")

    connection.execute(
        text(
            """
            INSERT INTO users (id, name, email, hashed_password, role, created_at)
            VALUES (:id, :name, :email, :hashed_password, :role, NOW())
            """
        ),
        {
            "id": admin_id,
            "name": "Admin",
            "email": "admin@admin.com",
            "hashed_password": hashed_password,
            "role": "admin",
        },
    )


def downgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        text(
            """
            DELETE FROM users
            WHERE email = :email
            """
        ),
        {"email": "admin@admin.com"},
    )

