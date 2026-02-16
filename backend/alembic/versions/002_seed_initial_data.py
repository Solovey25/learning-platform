"""seed initial data

Revision ID: 002_seed_initial_data
Revises: 001_add_enrollment_code
Create Date: 2026-02-15 00:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import uuid
import random
import string


revision = "002_seed_initial_data"
down_revision = "001_add_enrollment_code"
branch_labels = None
depends_on = None


def _generate_uuid() -> str:
    return str(uuid.uuid4())


def _generate_enrollment_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(8))


def upgrade() -> None:
    connection = op.get_bind()

    result = connection.execute(text("SELECT 1 FROM courses LIMIT 1"))
    if result.scalar():
        return

    user_id = _generate_uuid()
    course_id = _generate_uuid()
    chapter_id = _generate_uuid()
    enrollment_code = _generate_enrollment_code()

    connection.execute(
        text(
            """
            INSERT INTO users (id, name, email, hashed_password, role, created_at)
            VALUES (:id, :name, :email, :hashed_password, :role, NOW())
            """
        ),
        {
            "id": user_id,
            "name": "Demo User",
            "email": "demo@example.com",
            "hashed_password": "$2b$12$u9utp6GwuhJpOk1rVRm2ReNOIhoLe5h5Fl/U2xXTH/zcrJD1q0qzW",
            "role": "user",
        },
    )

    connection.execute(
        text(
            """
            INSERT INTO courses (id, title, description, image_url, enrollment_code, created_at)
            VALUES (:id, :title, :description, :image_url, :enrollment_code, NOW())
            """
        ),
        {
            "id": course_id,
            "title": "Getting Started with Git",
            "description": "Learn the basics of Git: commits, branches, and collaboration.",
            "image_url": "https://www.svgrepo.com/show/303548/git-icon-logo.svg",
            "enrollment_code": enrollment_code,
        },
    )

    connection.execute(
        text(
            """
            INSERT INTO chapters (id, course_id, title, content, "order", created_at)
            VALUES (:id, :course_id, :title, :content, :order, NOW())
            """
        ),
        {
            "id": chapter_id,
            "course_id": course_id,
            "title": "Introduction to Git",
            "content": "What is Git, why version control matters, and basic workflow.",
            "order": 0,
        },
    )


def downgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        text(
            """
            DELETE FROM user_progress
            WHERE user_id IN (SELECT id FROM users WHERE email = :email)
            """
        ),
        {"email": "demo@example.com"},
    )

    connection.execute(
        text(
            """
            DELETE FROM enrollments
            WHERE user_id IN (SELECT id FROM users WHERE email = :email)
            """
        ),
        {"email": "demo@example.com"},
    )

    connection.execute(
        text(
            """
            DELETE FROM quizzes
            WHERE chapter_id IN (
                SELECT id FROM chapters
                WHERE course_id IN (
                    SELECT id FROM courses WHERE title = :title
                )
            )
            """
        ),
        {"title": "Getting Started with Git"},
    )

    connection.execute(
        text(
            """
            DELETE FROM user_progress
            WHERE chapter_id IN (
                SELECT id FROM chapters
                WHERE course_id IN (
                    SELECT id FROM courses WHERE title = :title
                )
            )
            """
        ),
        {"title": "Getting Started with Git"},
    )

    connection.execute(
        text(
            """
            DELETE FROM chapters
            WHERE course_id IN (
                SELECT id FROM courses WHERE title = :title
            )
            """
        ),
        {"title": "Getting Started with Git"},
    )

    connection.execute(
        text(
            """
            DELETE FROM courses
            WHERE title = :title
            """
        ),
        {"title": "Getting Started with Git"},
    )

    connection.execute(
        text(
            """
            DELETE FROM users
            WHERE email = :email
            """
        ),
        {"email": "demo@example.com"},
    )

