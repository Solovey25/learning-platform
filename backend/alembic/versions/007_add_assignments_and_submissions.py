"""add assignments and submissions

Revision ID: 007_assignments
Revises: 006_add_groups_and_members
Create Date: 2026-02-15 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "007_assignments"
down_revision = "006_add_groups_and_members"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assignments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("course_id", sa.String(), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("chapter_id", sa.String(), sa.ForeignKey("chapters.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "assignment_submissions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("assignment_id", sa.String(), sa.ForeignKey("assignments.id"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("repository_url", sa.String(), nullable=True),
        sa.Column("text_answer", sa.Text(), nullable=True),
        sa.Column("attachments", sa.JSON(), nullable=True),
        sa.Column("grade", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("graded_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "ix_assignment_submissions_assignment_user",
        "assignment_submissions",
        ["assignment_id", "user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_assignment_submissions_assignment_user",
        table_name="assignment_submissions",
    )
    op.drop_table("assignment_submissions")
    op.drop_table("assignments")
