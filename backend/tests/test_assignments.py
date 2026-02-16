from fastapi import status
from sqlalchemy.orm import Session

from app.db import models


def create_course_and_assignment(client, admin_token: str, db: Session) -> tuple[str, str]:
    course_payload = {
        "title": "Assignments Course",
        "description": "Course for assignments tests",
        "imageUrl": "https://example.com/image.svg",
        "estimatedMinutes": 60,
        "chapters": [],
    }

    course_response = client.post(
        "/admin/courses",
        json=course_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert course_response.status_code == status.HTTP_200_OK
    course_id = course_response.json()["id"]

    assignment_payload = {
        "title": "Test Assignment",
        "description": "Solve the task",
        "dueDate": None,
        "chapterId": None,
    }

    assignment_response = client.post(
        f"/admin/courses/{course_id}/assignments",
        json=assignment_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert assignment_response.status_code == status.HTTP_200_OK
    assignment_id = assignment_response.json()["id"]

    return course_id, assignment_id


def enroll_user_to_course(
    db: Session,
    user: models.User,
    course_id: str,
) -> models.Enrollment:
    enrollment = models.Enrollment(user_id=user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def test_create_submission_success(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    payload = {
        "repositoryUrl": "https://github.com/example/repo",
        "textAnswer": "My solution",
        "attachments": {"files": []},
    }

    response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["assignmentId"] == assignment_id
    assert data["userId"] == regular_user.id
    assert data["repositoryUrl"] == payload["repositoryUrl"]
    assert data["textAnswer"] == payload["textAnswer"]


def test_create_submission_for_not_enrolled_user_forbidden(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)

    payload = {
        "repositoryUrl": "https://github.com/example/repo",
        "textAnswer": "My solution",
        "attachments": None,
    }

    response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert "нужно быть записанным" in data["detail"]


def test_create_submission_twice_returns_400(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    payload = {
        "repositoryUrl": "https://github.com/example/repo",
        "textAnswer": "First solution",
        "attachments": None,
    }

    first_response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert first_response.status_code == status.HTTP_201_CREATED

    second_response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert second_response.status_code == status.HTTP_400_BAD_REQUEST
    data = second_response.json()
    assert "уже отправил работу" in data["detail"].lower()


def test_grade_submission_updates_fields(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    submission_response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json={"textAnswer": "To be graded"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert submission_response.status_code == status.HTTP_201_CREATED
    submission_id = submission_response.json()["id"]

    grade_payload = {
        "grade": 95,
        "feedback": "Well done",
    }

    grade_response = client.post(
        f"/assignments/{assignment_id}/submissions/{submission_id}/grade",
        json=grade_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert grade_response.status_code == status.HTTP_200_OK
    data = grade_response.json()
    assert data["id"] == submission_id
    assert data["grade"] == grade_payload["grade"]
    assert data["feedback"] == grade_payload["feedback"]
    assert data["gradedBy"] is not None
    assert data["gradedAt"] is not None


def test_get_assignment_returns_detail(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)

    response = client.get(
        f"/assignments/{assignment_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == assignment_id
    assert data["courseId"] == course_id
    assert data["title"] == "Test Assignment"


def test_list_submissions_for_assignment_as_admin(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    payload = {
        "repositoryUrl": "https://github.com/example/repo",
        "textAnswer": "Answer one",
        "attachments": None,
    }

    response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED

    list_response = client.get(
        f"/assignments/{assignment_id}/submissions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert list_response.status_code == status.HTTP_200_OK
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["assignmentId"] == assignment_id
    assert items[0]["userId"] == regular_user.id


def test_get_submission_by_owner(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    submission_response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json={"textAnswer": "Owner submission"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert submission_response.status_code == status.HTTP_201_CREATED
    submission_id = submission_response.json()["id"]

    get_response = client.get(
        f"/assignments/{assignment_id}/submissions/{submission_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert get_response.status_code == status.HTTP_200_OK
    data = get_response.json()
    assert data["id"] == submission_id
    assert data["assignmentId"] == assignment_id
    assert data["userId"] == regular_user.id


def test_get_my_assignments_includes_enrolled_courses_and_latest_submission(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id_1, assignment_id_1 = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id_1)

    submission_response = client.post(
        f"/assignments/{assignment_id_1}/submissions",
        json={"textAnswer": "Solution for assignment 1"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert submission_response.status_code == status.HTTP_201_CREATED
    submission_id_1 = submission_response.json()["id"]

    course_id_2, assignment_id_2 = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id_2)

    response = client.get(
        "/users/me/assignments",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    by_assignment = {item["assignmentId"]: item for item in items}

    assert assignment_id_1 in by_assignment
    assert assignment_id_2 in by_assignment

    item1 = by_assignment[assignment_id_1]
    assert item1["courseId"] == course_id_1
    assert item1["latestSubmissionId"] == submission_id_1

    item2 = by_assignment[assignment_id_2]
    assert item2["courseId"] == course_id_2
    assert item2["latestSubmissionId"] is None


def test_get_assignment_unauthorized_without_token(
    client,
    db: Session,
    admin_token: str,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    assert course_id

    response = client.get(f"/assignments/{assignment_id}")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_submissions_for_assignment_forbidden_for_non_admin(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id, assignment_id = create_course_and_assignment(client, admin_token, db)
    enroll_user_to_course(db, regular_user, course_id)

    payload = {
        "repositoryUrl": "https://github.com/example/repo",
        "textAnswer": "Answer one",
        "attachments": None,
    }

    create_response = client.post(
        f"/assignments/{assignment_id}/submissions",
        json=payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert create_response.status_code == status.HTTP_201_CREATED

    list_response = client.get(
        f"/assignments/{assignment_id}/submissions",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert list_response.status_code == status.HTTP_403_FORBIDDEN
    data = list_response.json()
    assert "not enough permissions" in data["detail"].lower()
