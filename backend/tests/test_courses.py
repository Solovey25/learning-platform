from fastapi import status
from sqlalchemy.orm import Session

from app.db import models


def test_generate_enrollment_code_format_and_uniqueness():
    codes = [models.generate_enrollment_code() for _ in range(50)]

    for code in codes:
        assert len(code) == 8
        assert all(ch.isupper() or ch.isdigit() for ch in code)

    assert len(set(codes)) > 1


def create_course_via_api(client, admin_token: str) -> str:
    payload = {
        "title": "API Test Course",
        "description": "Course created via API for tests",
        "imageUrl": "https://example.com/image.svg",
        "estimatedMinutes": 45,
        "chapters": [
            {
                "id": "chapter-1",
                "title": "Intro",
                "content": "Intro content",
                "quiz": [
                    {
                        "id": "quiz-1",
                        "question": "2+2=?",
                        "options": ["3", "4", "5", "6"],
                        "correctOption": 1,
                    }
                ],
            }
        ],
    }

    response = client.post(
        "/admin/courses",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["enrollmentCode"] is not None
    return data["id"]


def test_get_all_courses_returns_list(client, db: Session, admin_token: str):
    course_id = create_course_via_api(client, admin_token)

    response = client.get("/courses")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert any(course["id"] == course_id for course in data)


def test_get_user_courses_unauthorized_without_token(client):
    response = client.get("/courses/user")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_submit_quiz_updates_progress_for_enrolled_user(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    course_response = client.get(
        f"/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert course_response.status_code == status.HTTP_200_OK
    enrollment_code = course_response.json()["enrollmentCode"]
    assert enrollment_code

    participate_response = client.post(
        f"/courses/{course_id}/participate",
        json={"enrollmentCode": enrollment_code},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert participate_response.status_code == status.HTTP_200_OK

    admin_course_response = client.get(
        f"/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_course_response.status_code == status.HTTP_200_OK
    course_data = admin_course_response.json()
    chapter_id = course_data["chapters"][0]["id"]
    quiz_id = course_data["chapters"][0]["quiz"][0]["id"]
    correct_option = course_data["chapters"][0]["quiz"][0]["correctOption"]

    submission_payload = {
        "answers": {
            quiz_id: correct_option,
        }
    }

    response = client.post(
        f"/courses/{course_id}/chapters/{chapter_id}/quiz",
        json=submission_payload,
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["score"] == 100
    assert data["passed"] is True
    assert data["correctAnswers"] == 1
    assert data["totalQuestions"] == 1

    progress = (
        db.query(models.UserProgress)
        .filter(
            models.UserProgress.user_id == regular_user.id,
            models.UserProgress.course_id == course_id,
            models.UserProgress.chapter_id == chapter_id,
        )
        .first()
    )
    assert progress is not None
    assert progress.quiz_score == 100
    assert progress.completed is True
    assert progress.completed_at is not None


def test_get_chapter_forbidden_for_not_enrolled_user(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    assert course is not None
    assert course.chapters
    chapter = course.chapters[0]

    response = client.get(
        f"/courses/{course_id}/chapters/{chapter.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert "must be enrolled" in data["detail"]


def test_participate_in_course_success(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    course_response = client.get(
        f"/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert course_response.status_code == status.HTTP_200_OK
    enrollment_code = course_response.json()["enrollmentCode"]
    assert enrollment_code

    response = client.post(
        f"/courses/{course_id}/participate",
        json={"enrollmentCode": enrollment_code},
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "joined course" in data["message"].lower()

    enrollment = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.user_id == regular_user.id,
        )
        .first()
    )
    assert enrollment is not None


def test_delete_course_without_enrollments_succeeds(
    client,
    db: Session,
    admin_token: str,
):
    course_id = create_course_via_api(client, admin_token)

    response = client.delete(
        f"/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Course deleted successfully"

    deleted_course = (
        db.query(models.Course).filter(models.Course.id == course_id).first()
    )
    assert deleted_course is None


def test_delete_course_with_enrollments_cleans_enrollments(
    client,
    db: Session,
    admin_token: str,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    enroll_response = client.post(
        f"/admin/courses/{course_id}/enroll-user",
        json={"email": regular_user.email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert enroll_response.status_code == status.HTTP_200_OK

    existing_enrollment = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.user_id == regular_user.id,
        )
        .first()
    )
    assert existing_enrollment is not None

    response = client.delete(
        f"/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Course deleted successfully"

    remaining_enrollments = (
        db.query(models.Enrollment)
        .filter(models.Enrollment.course_id == course_id)
        .all()
    )
    assert remaining_enrollments == []


def test_list_assignments_for_course_admin(
    client,
    db: Session,
    admin_token: str,
):
    course_id = create_course_via_api(client, admin_token)

    assignment_payload = {
        "title": "Admin Assignment",
        "description": "Admin created assignment",
        "dueDate": None,
        "chapterId": None,
    }

    create_assignment_response = client.post(
        f"/admin/courses/{course_id}/assignments",
        json=assignment_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_assignment_response.status_code == status.HTTP_200_OK
    assignment_id = create_assignment_response.json()["id"]

    list_response = client.get(
        f"/admin/courses/{course_id}/assignments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert list_response.status_code == status.HTTP_200_OK
    items = list_response.json()
    assert isinstance(items, list)
    assert any(item["id"] == assignment_id for item in items)


def test_list_assignments_for_course_user_requires_enrollment(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
):
    course_id = create_course_via_api(client, admin_token)

    assignment_payload = {
        "title": "User Assignment",
        "description": "Assignment for user",
        "dueDate": None,
        "chapterId": None,
    }

    create_assignment_response = client.post(
        f"/admin/courses/{course_id}/assignments",
        json=assignment_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_assignment_response.status_code == status.HTTP_200_OK

    forbidden_response = client.get(
        f"/courses/{course_id}/assignments",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert forbidden_response.status_code == status.HTTP_403_FORBIDDEN
    data = forbidden_response.json()
    assert "Нужно быть записанным" in data["detail"]


def test_list_assignments_for_course_user_with_enrollment(
    client,
    db: Session,
    admin_token: str,
    user_token: str,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    assignment_payload = {
        "title": "User Enrolled Assignment",
        "description": "Assignment visible for enrolled user",
        "dueDate": None,
        "chapterId": None,
    }

    create_assignment_response = client.post(
        f"/admin/courses/{course_id}/assignments",
        json=assignment_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_assignment_response.status_code == status.HTTP_200_OK
    assignment_id = create_assignment_response.json()["id"]

    course_response = client.get(
        f"/courses/{course_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert course_response.status_code == status.HTTP_200_OK
    enrollment_code = course_response.json()["enrollmentCode"]

    participate_response = client.post(
        f"/courses/{course_id}/participate",
        json={"enrollmentCode": enrollment_code},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert participate_response.status_code == status.HTTP_200_OK

    list_response = client.get(
        f"/courses/{course_id}/assignments",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert list_response.status_code == status.HTTP_200_OK
    items = list_response.json()
    assert isinstance(items, list)
    assert any(item["id"] == assignment_id for item in items)


def test_get_course_participants_empty(
    client,
    db: Session,
    admin_token: str,
):
    course_id = create_course_via_api(client, admin_token)

    response = client.get(
        f"/admin/courses/{course_id}/participants",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["courseId"] == course_id
    assert isinstance(data["participants"], list)
    assert data["participants"] == []


def test_get_course_participants_with_groups(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    user1 = models.User(
        email="participant1@example.com",
        name="Participant One",
        hashed_password="test",
        role="user",
    )
    user2 = models.User(
        email="participant2@example.com",
        name="Participant Two",
        hashed_password="test",
        role="user",
    )
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)

    enrollment1 = models.Enrollment(user_id=user1.id, course_id=course_id)
    enrollment2 = models.Enrollment(user_id=user2.id, course_id=course_id)
    db.add(enrollment1)
    db.add(enrollment2)

    group = models.Group(
        name="Test Group",
        description="Test group description",
        owner_id=admin_user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    member = models.GroupMember(user_id=user1.id, group_id=group.id)
    db.add(member)
    db.commit()

    response = client.get(
        f"/admin/courses/{course_id}/participants",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["courseId"] == course_id

    participants = data["participants"]
    assert isinstance(participants, list)
    assert len(participants) == 2

    by_user = {p["userId"]: p for p in participants}

    assert user1.id in by_user
    assert user2.id in by_user

    p1 = by_user[user1.id]
    assert p1["email"] == user1.email
    assert len(p1["groups"]) == 1
    assert p1["groups"][0]["groupId"] == group.id
    assert p1["groups"][0]["name"] == group.name

    p2 = by_user[user2.id]
    assert p2["email"] == user2.email
    assert p2["groups"] == []


def test_create_group_with_course(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    payload = {
        "name": "Backend Group",
        "description": "Group for backend developers",
        "courseId": course_id,
    }

    response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["description"] == payload["description"]
    assert data["ownerId"] == admin_user.id
    assert isinstance(data["courses"], list)
    assert len(data["courses"]) == 1
    assert data["courses"][0]["courseId"] == course_id


def test_list_groups_returns_group_with_counts(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id_1 = create_course_via_api(client, admin_token)
    course_id_2 = create_course_via_api(client, admin_token)

    payload = {
        "name": "Counted Group",
        "description": "Group with members and courses",
        "courseId": course_id_1,
    }

    create_response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == status.HTTP_200_OK
    group_id = create_response.json()["id"]

    user1 = models.User(
        email="groupcount1@example.com",
        name="Group Count One",
        hashed_password="test",
        role="user",
    )
    user2 = models.User(
        email="groupcount2@example.com",
        name="Group Count Two",
        hashed_password="test",
        role="user",
    )
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)

    member1 = models.GroupMember(user_id=user1.id, group_id=group_id)
    member2 = models.GroupMember(user_id=user2.id, group_id=group_id)
    db.add(member1)
    db.add(member2)

    second_link = models.GroupCourse(group_id=group_id, course_id=course_id_2)
    db.add(second_link)
    db.commit()

    response = client.get(
        "/admin/groups",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    groups = response.json()
    assert isinstance(groups, list)

    target = next(g for g in groups if g["id"] == group_id)
    assert target["name"] == payload["name"]
    assert target["ownerId"] == admin_user.id
    assert target["memberCount"] == 2
    assert target["courseCount"] == 2


def test_get_group_returns_members_and_courses(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    payload = {
        "name": "Detail Group",
        "description": "Group for detail endpoint",
        "courseId": course_id,
    }

    create_response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == status.HTTP_200_OK
    group_id = create_response.json()["id"]

    user1 = models.User(
        email="groupdetail1@example.com",
        name="Group Detail One",
        hashed_password="test",
        role="user",
    )
    db.add(user1)
    db.commit()
    db.refresh(user1)

    member = models.GroupMember(user_id=user1.id, group_id=group_id)
    db.add(member)
    db.commit()

    response = client.get(
        f"/admin/groups/{group_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == group_id
    assert data["name"] == payload["name"]
    assert data["ownerId"] == admin_user.id

    members = data["members"]
    assert isinstance(members, list)
    assert len(members) == 1
    assert members[0]["userId"] == user1.id
    assert members[0]["email"] == user1.email

    courses = data["courses"]
    assert isinstance(courses, list)
    assert len(courses) == 1
    assert courses[0]["courseId"] == course_id


def test_enroll_group_to_course_creates_enrollments_and_link(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    payload = {
        "name": "Enrollment Group",
        "description": "Group for course enrollment",
        "courseId": None,
    }

    create_response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == status.HTTP_200_OK
    group_id = create_response.json()["id"]

    user1 = models.User(
        email="groupenroll1@example.com",
        name="Group Enroll One",
        hashed_password="test",
        role="user",
    )
    user2 = models.User(
        email="groupenroll2@example.com",
        name="Group Enroll Two",
        hashed_password="test",
        role="user",
    )
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)

    member1 = models.GroupMember(user_id=user1.id, group_id=group_id)
    member2 = models.GroupMember(user_id=user2.id, group_id=group_id)
    db.add(member1)
    db.add(member2)
    db.commit()

    existing_enrollments = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.user_id.in_([user1.id, user2.id]),
        )
        .all()
    )
    assert existing_enrollments == []

    response = client.post(
        f"/admin/groups/{group_id}/courses/{course_id}/enroll",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == group_id

    enrollments = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.user_id.in_([user1.id, user2.id]),
        )
        .all()
    )
    assert len(enrollments) == 2

    link = (
        db.query(models.GroupCourse)
        .filter(
            models.GroupCourse.group_id == group_id,
            models.GroupCourse.course_id == course_id,
        )
        .first()
    )
    assert link is not None


def test_update_group_changes_fields(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    payload = {
        "name": "Initial Group",
        "description": "Initial description",
        "courseId": course_id,
    }

    create_response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == status.HTTP_200_OK
    group_id = create_response.json()["id"]

    update_payload = {
        "name": "Updated Group",
        "description": "Updated description",
        "status": "archived",
    }

    response = client.patch(
        f"/admin/groups/{group_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == group_id
    assert data["name"] == update_payload["name"]
    assert data["description"] == update_payload["description"]
    assert data["ownerId"] == admin_user.id
    assert data["status"] == update_payload["status"]


def test_add_group_member_by_email_creates_member(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    payload = {
        "name": "Members Group",
        "description": "Group for adding members",
        "courseId": course_id,
    }

    create_response = client.post(
        "/admin/groups",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == status.HTTP_200_OK
    group_id = create_response.json()["id"]

    user = models.User(
        email="memberadd@example.com",
        name="Member Add User",
        hashed_password="test",
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.post(
        f"/admin/groups/{group_id}/members",
        json={"email": user.email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == group_id

    members = data["members"]
    assert any(m["userId"] == user.id for m in members)

    db_members = (
        db.query(models.GroupMember)
        .filter(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == user.id,
        )
        .all()
    )
    assert len(db_members) == 1


def test_admin_analytics_overview_with_course_progress(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
    regular_user: models.User,
):
    course_id_1 = create_course_via_api(client, admin_token)
    course_id_2 = create_course_via_api(client, admin_token)

    enroll_response = client.post(
        f"/admin/courses/{course_id_1}/enroll-user",
        json={"email": regular_user.email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert enroll_response.status_code == status.HTTP_200_OK

    course1 = db.query(models.Course).filter(models.Course.id == course_id_1).first()
    assert course1 is not None
    chapter1 = course1.chapters[0]

    progress = models.UserProgress(
        user_id=regular_user.id,
        course_id=course_id_1,
        chapter_id=chapter1.id,
        completed=True,
    )
    db.add(progress)
    db.commit()

    response = client.get(
        "/admin/analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["totalUsers"] >= 2
    assert data["totalAdmins"] >= 1
    assert data["totalStudents"] == data["totalUsers"] - data["totalAdmins"]

    assert data["totalCourses"] == 2
    assert data["totalChapters"] == 2
    assert data["totalQuizzes"] == 2
    assert data["totalEnrollments"] == 1
    assert data["totalCompletedChapters"] == 1

    courses_stats = {c["courseId"]: c for c in data["courses"]}
    assert courses_stats[course_id_1]["totalEnrollments"] == 1
    assert courses_stats[course_id_1]["completionRate"] == 100.0
    assert courses_stats[course_id_2]["totalEnrollments"] == 0
    assert courses_stats[course_id_2]["completionRate"] == 0.0

    assert data["averageCompletionRate"] == 100.0


def test_admin_analytics_requires_auth(client):
    response = client.get("/admin/analytics")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_admin_analytics_forbidden_for_non_admin(
    client,
    user_token: str,
):
    response = client.get(
        "/admin/analytics",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert "not enough permissions" in data["detail"].lower()


def test_admin_course_users_analytics(
    client,
    db: Session,
    admin_token: str,
    admin_user: models.User,
    regular_user: models.User,
):
    course_id = create_course_via_api(client, admin_token)

    enroll_response = client.post(
        f"/admin/courses/{course_id}/enroll-user",
        json={"email": regular_user.email},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert enroll_response.status_code == status.HTTP_200_OK

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    assert course is not None
    assert len(course.chapters) == 1
    chapter = course.chapters[0]

    progress = models.UserProgress(
        user_id=regular_user.id,
        course_id=course_id,
        chapter_id=chapter.id,
        completed=True,
    )
    db.add(progress)
    db.commit()

    response = client.get(
        f"/admin/analytics/courses/{course_id}/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["courseId"] == course_id
    assert data["totalChapters"] == 1

    users = data["users"]
    assert len(users) == 1
    user_stats = users[0]

    assert user_stats["userId"] == regular_user.id
    assert user_stats["email"] == regular_user.email
    assert user_stats["completedChapters"] == 1
    assert user_stats["progress"] == 100
    assert user_stats["currentChapterOrder"] == 1
    assert user_stats["currentChapterTitle"] is None


def test_admin_course_users_analytics_not_found_for_unknown_course(
    client,
    admin_token: str,
):
    response = client.get(
        "/admin/analytics/courses/non-existent-course/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["detail"] == "Course not found"
