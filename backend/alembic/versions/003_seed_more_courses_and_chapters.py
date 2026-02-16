"""seed additional courses and chapters

Revision ID: 003_seed_more_courses
Revises: 002_seed_initial_data
Create Date: 2026-02-15 01:00:00.000000

"""
from alembic import op
from sqlalchemy import text
import uuid
import random
import string

revision = "003_seed_more_courses"
down_revision = "002_seed_initial_data"
branch_labels = None
depends_on = None


def _generate_uuid() -> str:
    return str(uuid.uuid4())


def _generate_enrollment_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(8))


def upgrade() -> None:
    connection = op.get_bind()

    result = connection.execute(
        text("SELECT id FROM courses WHERE title = :title"),
        {"title": "Getting Started with Git"},
    )
    base_course_id = result.scalar()

    if not base_course_id:
        return

    chapters = [
        {
            "course_id": base_course_id,
            "title": "Installing Git and First Commit",
            "content": "Install Git, configure user, and create your first commit.",
            "order": 1,
        },
        {
            "course_id": base_course_id,
            "title": "Exploring History with git log",
            "content": "Use git log and related commands to inspect history.",
            "order": 2,
        },
        {
            "course_id": base_course_id,
            "title": "Working with Remotes",
            "content": "Connect to remote repositories and synchronize changes.",
            "order": 3,
        },
    ]

    for chapter in chapters:
        connection.execute(
            text(
                """
                INSERT INTO chapters (id, course_id, title, content, "order", created_at)
                VALUES (:id, :course_id, :title, :content, :order, NOW())
                """
            ),
            {
                "id": _generate_uuid(),
                "course_id": chapter["course_id"],
                "title": chapter["title"],
                "content": chapter["content"],
                "order": chapter["order"],
            },
        )

    branching_course_id = _generate_uuid()
    branching_code = _generate_enrollment_code()

    connection.execute(
        text(
            """
            INSERT INTO courses (id, title, description, image_url, enrollment_code, created_at)
            VALUES (:id, :title, :description, :image_url, :enrollment_code, NOW())
            """
        ),
        {
            "id": branching_course_id,
            "title": "Стратегии ветвления в Git",
            "description": "Научись работать с ветками и организовывать параллельную работу в проекте.",
            "image_url": "https://www.svgrepo.com/show/303548/git-icon-logo.svg",
            "enrollment_code": branching_code,
        },
    )

    branching_chapters = [
        {
            "course_id": branching_course_id,
            "title": "Creating and Switching Branches",
            "content": "Create branches and move between them safely.",
            "order": 0,
        },
        {
            "course_id": branching_course_id,
            "title": "Merging Branches",
            "content": "Merge feature branches back into main.",
            "order": 1,
        },
        {
            "course_id": branching_course_id,
            "title": "Resolving Merge Conflicts",
            "content": "Understand and resolve merge conflicts effectively.",
            "order": 2,
        },
    ]

    for chapter in branching_chapters:
        connection.execute(
            text(
                """
                INSERT INTO chapters (id, course_id, title, content, "order", created_at)
                VALUES (:id, :course_id, :title, :content, :order, NOW())
                """
            ),
            {
                "id": _generate_uuid(),
                "course_id": chapter["course_id"],
                "title": chapter["title"],
                "content": chapter["content"],
                "order": chapter["order"],
            },
        )

    collaboration_course_id = _generate_uuid()
    collaboration_code = _generate_enrollment_code()

    connection.execute(
        text(
            """
            INSERT INTO courses (id, title, description, image_url, enrollment_code, created_at)
            VALUES (:id, :title, :description, :image_url, :enrollment_code, NOW())
            """
        ),
        {
            "id": collaboration_course_id,
            "title": "GitHub Collaboration",
            "description": "Use GitHub for pull requests, reviews, and team workflows.",
            "image_url": "https://www.svgrepo.com/show/303548/git-icon-logo.svg",
            "enrollment_code": collaboration_code,
        },
    )

    collaboration_chapters = [
        {
            "course_id": collaboration_course_id,
            "title": "Forks and Pull Requests",
            "content": "Create forks and open pull requests on GitHub.",
            "order": 0,
        },
        {
            "course_id": collaboration_course_id,
            "title": "Code Review Workflow",
            "content": "Review code and address feedback efficiently.",
            "order": 1,
        },
        {
            "course_id": collaboration_course_id,
            "title": "Protected Branches and Required Reviews",
            "content": "Configure branch protection rules and required approvals.",
            "order": 2,
        },
    ]

    for chapter in collaboration_chapters:
        connection.execute(
            text(
                """
                INSERT INTO chapters (id, course_id, title, content, "order", created_at)
                VALUES (:id, :course_id, :title, :content, :order, NOW())
                """
            ),
            {
                "id": _generate_uuid(),
                "course_id": chapter["course_id"],
                "title": chapter["title"],
                "content": chapter["content"],
                "order": chapter["order"],
            },
        )


def downgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        text(
            """
            DELETE FROM chapters
            WHERE course_id IN (
                SELECT id FROM courses
                WHERE title IN (
                    'Стратегии ветвления в Git',
                    'GitHub Collaboration'
                )
            )
        """
        )
    )

    connection.execute(
        text(
            """
            DELETE FROM chapters
            WHERE course_id = (
                SELECT id FROM courses
                WHERE title = 'Getting Started with Git'
            )
            AND title IN (
                'Installing Git and First Commit',
                'Exploring History with git log',
                'Working with Remotes'
            )
        """
        )
    )

    connection.execute(
        text(
            """
            DELETE FROM courses
            WHERE title IN (
                'Стратегии ветвления в Git',
                'GitHub Collaboration'
            )
        """
        )
    )

