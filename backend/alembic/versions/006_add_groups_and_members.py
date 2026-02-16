"""add groups and group memberships

Revision ID: 006_add_groups_and_members
Revises: 005_add_admin_user
Create Date: 2026-02-15 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "006_add_groups_and_members"
down_revision = "005_add_admin_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "group_members",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("group_id", sa.String(), sa.ForeignKey("groups.id"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
    )
    op.create_unique_constraint(
        "uq_group_members_group_user",
        "group_members",
        ["group_id", "user_id"],
    )

    op.create_table(
        "group_courses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("group_id", sa.String(), sa.ForeignKey("groups.id"), nullable=False),
        sa.Column("course_id", sa.String(), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("NOW()")),
    )
    op.create_unique_constraint(
        "uq_group_courses_group_course",
        "group_courses",
        ["group_id", "course_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_group_courses_group_course", "group_courses", type_="unique")
    op.drop_table("group_courses")

    op.drop_constraint("uq_group_members_group_user", "group_members", type_="unique")
    op.drop_table("group_members")

    op.drop_table("groups")

