"""seed quizzes, enrollments, and user progress

Revision ID: 004_seed_quizzes_progress
Revises: 003_seed_more_courses
Create Date: 2026-02-15 01:10:00.000000

"""
from alembic import op
from sqlalchemy import text
import uuid
import json

revision = "004_seed_quizzes_progress"
down_revision = "003_seed_more_courses"
branch_labels = None
depends_on = None


def _generate_uuid() -> str:
    return str(uuid.uuid4())


def upgrade() -> None:
    connection = op.get_bind()

    quiz_specs = [
        {
            "course_title": "Getting Started with Git",
            "chapter_title": "Introduction to Git",
            "question": "What is Git primarily used for?",
            "options": [
                "Version control",
                "Text editing",
                "Image processing",
                "Database management",
            ],
            "correct_option": 0,
        },
        {
            "course_title": "Getting Started with Git",
            "chapter_title": "Installing Git and First Commit",
            "question": "Which command initializes a new Git repository?",
            "options": ["git init", "git start", "git new", "git create"],
            "correct_option": 0,
        },
        {
            "course_title": "Getting Started with Git",
            "chapter_title": "Exploring History with git log",
            "question": "Which command shows commit history?",
            "options": ["git status", "git history", "git log", "git diff"],
            "correct_option": 2,
        },
        {
            "course_title": "Getting Started with Git",
            "chapter_title": "Working with Remotes",
            "question": "Which command uploads local commits to a remote?",
            "options": ["git pull", "git fetch", "git push", "git clone"],
            "correct_option": 2,
        },
        {
            "course_title": "Стратегии ветвления в Git",
            "chapter_title": "Creating and Switching Branches",
            "question": "Which command creates a new branch?",
            "options": ["git branch new", "git branch feature", "git new-branch", "git switch"],
            "correct_option": 1,
        },
        {
            "course_title": "Стратегии ветвления в Git",
            "chapter_title": "Merging Branches",
            "question": "Which command merges a branch into the current branch?",
            "options": ["git merge", "git rebase", "git join", "git combine"],
            "correct_option": 0,
        },
        {
            "course_title": "Стратегии ветвления в Git",
            "chapter_title": "Resolving Merge Conflicts",
            "question": "What usually causes a merge conflict?",
            "options": [
                "Network issues",
                "Different changes to the same lines",
                "Large repository size",
                "Slow disk",
            ],
            "correct_option": 1,
        },
        {
            "course_title": "GitHub Collaboration",
            "chapter_title": "Forks and Pull Requests",
            "question": "What is a pull request?",
            "options": [
                "A request to copy a repo",
                "A request to merge changes",
                "A request to delete a branch",
                "A request to create a tag",
            ],
            "correct_option": 1,
        },
        {
            "course_title": "GitHub Collaboration",
            "chapter_title": "Code Review Workflow",
            "question": "Who usually reviews a pull request?",
            "options": [
                "Random GitHub users",
                "The repository owner only",
                "Team members or maintainers",
                "Automated bots only",
            ],
            "correct_option": 2,
        },
        {
            "course_title": "GitHub Collaboration",
            "chapter_title": "Protected Branches and Required Reviews",
            "question": "What is a protected branch?",
            "options": [
                "A branch that cannot be deleted or force-pushed",
                "A branch stored offline",
                "A password-protected branch",
                "A branch with no commits",
            ],
            "correct_option": 0,
        },
    ]

    for spec in quiz_specs:
        row = connection.execute(
            text(
                """
                SELECT ch.id AS chapter_id, c.id AS course_id
                FROM chapters ch
                JOIN courses c ON ch.course_id = c.id
                WHERE c.title = :course_title AND ch.title = :chapter_title
                """
            ),
            {
                "course_title": spec["course_title"],
                "chapter_title": spec["chapter_title"],
            },
        ).first()

        if not row:
            continue

        chapter_id = row.chapter_id

        connection.execute(
            text(
                """
                INSERT INTO quizzes (id, chapter_id, question, options, correct_option, created_at)
                VALUES (:id, :chapter_id, :question, :options, :correct_option, NOW())
                """
            ),
            {
                "id": _generate_uuid(),
                "chapter_id": chapter_id,
                "question": spec["question"],
                "options": json.dumps(spec["options"]),
                "correct_option": spec["correct_option"],
            },
        )

    demo_user = connection.execute(
        text("SELECT id, hashed_password FROM users WHERE email = :email"),
        {"email": "demo@example.com"},
    ).first()

    if demo_user:
        demo_user_id = demo_user.id
        demo_hash = demo_user.hashed_password
    else:
        demo_user_id = None
        demo_hash = None

    learner_user = connection.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": "learner@example.com"},
    ).scalar()

    if not learner_user and demo_hash:
        learner_user_id = _generate_uuid()
        connection.execute(
            text(
                """
                INSERT INTO users (id, name, email, hashed_password, role, created_at)
                VALUES (:id, :name, :email, :hashed_password, :role, NOW())
                """
            ),
            {
                "id": learner_user_id,
                "name": "Learner User",
                "email": "learner@example.com",
                "hashed_password": demo_hash,
                "role": "user",
            },
        )
    else:
        learner_user_id = learner_user

    enroll_specs = []

    if demo_user_id:
        enroll_specs.extend(
            [
                {
                    "user_id": demo_user_id,
                    "course_title": "Getting Started with Git",
                },
                {
                    "user_id": demo_user_id,
                    "course_title": "Стратегии ветвления в Git",
                },
            ]
        )

    if learner_user_id:
        enroll_specs.append(
            {
                "user_id": learner_user_id,
                "course_title": "GitHub Collaboration",
            }
        )

    for spec in enroll_specs:
        course_id = connection.execute(
            text("SELECT id FROM courses WHERE title = :title"),
            {"title": spec["course_title"]},
        ).scalar()

        if not course_id:
            continue

        existing = connection.execute(
            text(
                """
                SELECT id FROM enrollments
                WHERE user_id = :user_id AND course_id = :course_id
                """
            ),
            {"user_id": spec["user_id"], "course_id": course_id},
        ).scalar()

        if existing:
            continue

        connection.execute(
            text(
                """
                INSERT INTO enrollments (id, user_id, course_id, enrolled_at)
                VALUES (:id, :user_id, :course_id, NOW())
                """
            ),
            {
                "id": _generate_uuid(),
                "user_id": spec["user_id"],
                "course_id": course_id,
            },
        )

    progress_specs = []

    if demo_user_id:
        progress_specs.extend(
            [
                {
                    "user_id": demo_user_id,
                    "course_title": "Getting Started with Git",
                    "chapter_title": "Introduction to Git",
                    "completed": True,
                    "quiz_score": 100,
                },
                {
                    "user_id": demo_user_id,
                    "course_title": "Getting Started with Git",
                    "chapter_title": "Installing Git and First Commit",
                    "completed": True,
                    "quiz_score": 80,
                },
                {
                    "user_id": demo_user_id,
                    "course_title": "Стратегии ветвления в Git",
                    "chapter_title": "Creating and Switching Branches",
                    "completed": False,
                    "quiz_score": None,
                },
            ]
        )

    if learner_user_id:
        progress_specs.append(
            {
                "user_id": learner_user_id,
                "course_title": "GitHub Collaboration",
                "chapter_title": "Forks and Pull Requests",
                "completed": False,
                "quiz_score": None,
            }
        )

    for spec in progress_specs:
        row = connection.execute(
            text(
                """
                SELECT ch.id AS chapter_id, c.id AS course_id
                FROM chapters ch
                JOIN courses c ON ch.course_id = c.id
                WHERE c.title = :course_title AND ch.title = :chapter_title
                """
            ),
            {
                "course_title": spec["course_title"],
                "chapter_title": spec["chapter_title"],
            },
        ).first()

        if not row:
            continue

        chapter_id = row.chapter_id
        course_id = row.course_id

        connection.execute(
            text(
                """
                INSERT INTO user_progress (id, user_id, course_id, chapter_id, completed, quiz_score, completed_at)
                VALUES (:id, :user_id, :course_id, :chapter_id, :completed, :quiz_score, CASE WHEN :completed THEN NOW() ELSE NULL END)
                """
            ),
            {
                "id": _generate_uuid(),
                "user_id": spec["user_id"],
                "course_id": course_id,
                "chapter_id": chapter_id,
                "completed": spec["completed"],
                "quiz_score": spec["quiz_score"],
            },
        )


def downgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        text(
            """
            DELETE FROM user_progress
            WHERE course_id IN (
                SELECT id FROM courses
                WHERE title IN (
                    'Getting Started with Git',
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
            DELETE FROM enrollments
            WHERE course_id IN (
                SELECT id FROM courses
                WHERE title IN (
                    'Getting Started with Git',
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
            DELETE FROM quizzes
            WHERE chapter_id IN (
                SELECT ch.id
                FROM chapters ch
                JOIN courses c ON ch.course_id = c.id
                WHERE c.title IN (
                    'Getting Started with Git',
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
            DELETE FROM users
            WHERE email = 'learner@example.com'
        """
        )
    )
