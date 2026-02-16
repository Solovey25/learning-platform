"""initial schema

Revision ID: 000_initial_schema
Revises:
Create Date: 2026-02-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "000_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "courses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "chapters",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("course_id", sa.String(), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "quizzes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("chapter_id", sa.String(), sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("question", sa.String(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_option", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "enrollments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
    )

    op.create_table(
        "user_progress",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("chapter_id", sa.String(), sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("quiz_score", sa.Integer(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("user_progress")
    op.drop_table("enrollments")
    op.drop_table("quizzes")
    op.drop_table("chapters")
    op.drop_table("courses")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

