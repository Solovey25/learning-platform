import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db import models
from app.schemas import course as course_schema
from app.schemas import user as user_schema
from app.schemas import group as group_schema
from app.schemas import assignment as assignment_schema
from app.core.security import get_admin_user
from app.core.kafka_producer import send_event

router = APIRouter()


@router.get("/users", response_model=List[user_schema.AdminUserResponse])
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    users = query.order_by(models.User.email.asc()).all()
    return users


@router.get("/users/{user_id}", response_model=user_schema.AdminUserResponse)
def get_user_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    return user


@router.patch("/users/{user_id}", response_model=user_schema.AdminUserResponse)
def update_user(
    user_id: str,
    payload: user_schema.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    if payload.email and payload.email != user.email:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует",
            )

    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email

    user.updated_at = func.now()

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    db.delete(user)
    db.commit()
    return None

@router.post("/courses", response_model=course_schema.CourseResponse)
def create_course(
    course: course_schema.CourseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_course = models.Course(
        title=course.title,
        description=course.description,
        image_url=course.imageUrl,
        estimated_minutes=course.estimatedMinutes,
    )
    db.add(db_course)
    db.flush()
    
    for i, chapter_data in enumerate(course.chapters):
        db_chapter = models.Chapter(
            course_id=db_course.id,
            title=chapter_data.title,
            content=chapter_data.content,
            order=i
        )
        db.add(db_chapter)
        db.flush()
        
        for quiz_data in chapter_data.quiz:
            db_quiz = models.Quiz(
                chapter_id=db_chapter.id,
                question=quiz_data.question,
                options=quiz_data.options,
                correct_option=quiz_data.correctOption,
                question_type=getattr(quiz_data, "type", "choice"),
            )
            db.add(db_quiz)
    
    db.commit()
    db.refresh(db_course)
    
    formatted_chapters = []
    for chapter in db_course.chapters:
        formatted_quizzes = [
            {
                "id": quiz.id,
                "question": quiz.question,
                "options": quiz.options,
                "correctOption": quiz.correct_option,
                "type": getattr(quiz, "question_type", "choice") or "choice",
            }
            for quiz in chapter.quizzes
        ]
        
        formatted_chapters.append({
            "id": chapter.id,
            "title": chapter.title,
            "content": chapter.content,
            "quiz": formatted_quizzes,
            "completed": False
        })
    
    return {
        "id": db_course.id,
        "title": db_course.title,
        "description": db_course.description,
        "imageUrl": db_course.image_url,
        "chapters": formatted_chapters,
        "progress": 0,
        "enrolled": False,
        "enrollmentCode": db_course.enrollment_code,
        "estimatedMinutes": db_course.estimated_minutes,
    }


@router.post("/courses/{course_id}/enroll-user")
def enroll_user_to_course(
    course_id: str,
    payload: course_schema.CourseEnrollUserRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    course = (
        db.query(models.Course)
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден",
        )

    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь с таким email не найден",
        )

    existing_enrollment = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.user_id == user.id,
        )
        .first()
    )
    if existing_enrollment:
        return {
            "success": True,
            "message": "Пользователь уже записан на курс",
        }

    enrollment = models.Enrollment(
        user_id=user.id,
        course_id=course_id,
    )
    db.add(enrollment)
    db.commit()

    try:
        send_event(
            topic="notifications-events",
            key=user.id,
            event_type="course_enrolled",
            payload={
                "user_id": user.id,
                "course_id": course_id,
            },
        )
    except Exception:
        logging.exception("Failed to publish course_enrolled event")

    return {
        "success": True,
        "message": "Пользователь добавлен на курс",
    }


@router.post(
    "/courses/{course_id}/assignments",
    response_model=assignment_schema.AssignmentDetail,
)
def create_assignment(
    course_id: str,
    payload: assignment_schema.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    course = (
        db.query(models.Course)
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден",
        )

    chapter_id = payload.chapterId
    if chapter_id:
        chapter = (
            db.query(models.Chapter)
            .filter(
                models.Chapter.id == chapter_id,
                models.Chapter.course_id == course_id,
            )
            .first()
        )
        if not chapter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Глава не относится к этому курсу",
            )

    db_assignment = models.Assignment(
        course_id=course_id,
        chapter_id=chapter_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.dueDate,
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)

    return assignment_schema.AssignmentDetail(
        id=db_assignment.id,
        courseId=db_assignment.course_id,
        chapterId=db_assignment.chapter_id,
        title=db_assignment.title,
        description=db_assignment.description,
        dueDate=db_assignment.due_date,
        createdAt=db_assignment.created_at,
        updatedAt=db_assignment.updated_at,
    )


@router.get(
    "/courses/{course_id}/assignments",
    response_model=list[assignment_schema.AssignmentShort],
)
def list_assignments_for_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    course = (
        db.query(models.Course)
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден",
        )

    assignments = (
        db.query(models.Assignment)
        .filter(models.Assignment.course_id == course_id)
        .order_by(models.Assignment.created_at.asc())
        .all()
    )

    return [
        assignment_schema.AssignmentShort(
            id=a.id,
            courseId=a.course_id,
            chapterId=a.chapter_id,
            title=a.title,
            dueDate=a.due_date,
            createdAt=a.created_at,
        )
        for a in assignments
    ]


@router.post("/groups", response_model=group_schema.GroupDetail)
def create_group(
    payload: group_schema.GroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    db_group = models.Group(
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(db_group)
    db.flush()

    if payload.courseId:
        existing_link = (
            db.query(models.GroupCourse)
            .filter(
                models.GroupCourse.group_id == db_group.id,
                models.GroupCourse.course_id == payload.courseId,
            )
            .first()
        )
        if not existing_link:
            db_group_course = models.GroupCourse(
                group_id=db_group.id,
                course_id=payload.courseId,
            )
            db.add(db_group_course)

    db.commit()
    db.refresh(db_group)

    return group_schema.GroupDetail(
        id=db_group.id,
        name=db_group.name,
        description=db_group.description,
        status=db_group.status,
        ownerId=db_group.owner_id,
        members=[],
        courses=[
            group_schema.GroupCourseInfo(
                courseId=gc.course_id,
                title=gc.course.title if gc.course else "",
            )
            for gc in db_group.courses
        ],
    )


@router.get("/groups", response_model=List[group_schema.GroupSummary])
def list_groups(
    course_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    query = db.query(models.Group)

    if owner_id:
        query = query.filter(models.Group.owner_id == owner_id)
    if status_filter:
        query = query.filter(models.Group.status == status_filter)
    if course_id:
        query = query.join(models.GroupCourse).filter(
            models.GroupCourse.course_id == course_id
        )

    groups = query.all()
    if not groups:
        return []

    group_ids = [g.id for g in groups]

    member_counts = (
        db.query(
            models.GroupMember.group_id,
            func.count(models.GroupMember.id),
        )
        .filter(models.GroupMember.group_id.in_(group_ids))
        .group_by(models.GroupMember.group_id)
        .all()
    )
    member_count_map = {gid: count for gid, count in member_counts}

    course_counts = (
        db.query(
            models.GroupCourse.group_id,
            func.count(models.GroupCourse.id),
        )
        .filter(models.GroupCourse.group_id.in_(group_ids))
        .group_by(models.GroupCourse.group_id)
        .all()
    )
    course_count_map = {gid: count for gid, count in course_counts}

    result: List[group_schema.GroupSummary] = []
    for g in groups:
        result.append(
            group_schema.GroupSummary(
                id=g.id,
                name=g.name,
                description=g.description,
                status=g.status,
                ownerId=g.owner_id,
                memberCount=member_count_map.get(g.id, 0),
                courseCount=course_count_map.get(g.id, 0),
            )
        )

    return result


@router.get("/groups/{group_id}", response_model=group_schema.GroupDetail)
def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    member_rows = (
        db.query(
            models.User.id,
            models.User.name,
            models.User.email,
        )
        .join(models.GroupMember, models.GroupMember.user_id == models.User.id)
        .filter(models.GroupMember.group_id == group_id)
        .order_by(models.User.name.asc())
        .all()
    )

    members = [
        group_schema.GroupMemberInfo(
            userId=row[0],
            name=row[1],
            email=row[2],
        )
        for row in member_rows
    ]

    course_rows = (
        db.query(
            models.Course.id,
            models.Course.title,
        )
        .join(
            models.GroupCourse,
            models.GroupCourse.course_id == models.Course.id,
        )
        .filter(models.GroupCourse.group_id == group_id)
        .order_by(models.Course.title.asc())
        .all()
    )

    courses = [
        group_schema.GroupCourseInfo(
            courseId=row[0],
            title=row[1],
        )
        for row in course_rows
    ]

    return group_schema.GroupDetail(
        id=group.id,
        name=group.name,
        description=group.description,
        status=group.status,
        ownerId=group.owner_id,
        members=members,
        courses=courses,
    )


@router.patch("/groups/{group_id}", response_model=group_schema.GroupDetail)
def update_group(
    group_id: str,
    payload: group_schema.GroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    if payload.status is not None:
        group.status = payload.status

    group.updated_at = func.now()

    db.add(group)
    db.commit()
    db.refresh(group)

    return get_group(group_id, db, current_user)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    group.status = "archived"
    group.updated_at = func.now()

    db.add(group)
    db.commit()
    return None


@router.post("/groups/{group_id}/members", response_model=group_schema.GroupDetail)
def add_group_member(
    group_id: str,
    payload: group_schema.GroupMemberAddRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    if not payload.userId and not payload.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="userId or email must be provided",
        )

    user_query = db.query(models.User)
    if payload.userId:
        user_query = user_query.filter(models.User.id == payload.userId)
    if payload.email:
        user_query = user_query.filter(models.User.email == payload.email)

    user = user_query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    existing_member = (
        db.query(models.GroupMember)
        .filter(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == user.id,
        )
        .first()
    )
    if not existing_member:
        member = models.GroupMember(
            group_id=group_id,
            user_id=user.id,
        )
        db.add(member)
        db.commit()

        try:
            send_event(
                topic="notifications-events",
                key=user.id,
                event_type="group_member_added",
                payload={
                    "user_id": user.id,
                    "group_id": group_id,
                },
            )
        except Exception:
            logging.exception("Failed to publish group_member_added event")
    else:
        db.commit()

    return get_group(group_id, db, current_user)


@router.delete(
    "/groups/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_group_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    member = (
        db.query(models.GroupMember)
        .filter(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group member not found",
        )

    db.delete(member)
    db.commit()
    return None


@router.post(
    "/groups/{group_id}/courses/{course_id}/enroll",
    response_model=group_schema.GroupDetail,
)
def enroll_group_to_course(
    group_id: str,
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    member_rows = (
        db.query(models.GroupMember.user_id)
        .filter(models.GroupMember.group_id == group_id)
        .all()
    )
    user_ids = [row[0] for row in member_rows]

    newly_enrolled_user_ids: list[str] = []

    if user_ids:
        existing_enrollments = (
            db.query(models.Enrollment)
            .filter(
                models.Enrollment.course_id == course_id,
                models.Enrollment.user_id.in_(user_ids),
            )
            .all()
        )
        enrolled_user_ids = {e.user_id for e in existing_enrollments}

        for uid in user_ids:
            if uid not in enrolled_user_ids:
                enrollment = models.Enrollment(
                    user_id=uid,
                    course_id=course_id,
                )
                db.add(enrollment)
                newly_enrolled_user_ids.append(uid)

    existing_link = (
        db.query(models.GroupCourse)
        .filter(
            models.GroupCourse.group_id == group_id,
            models.GroupCourse.course_id == course_id,
        )
        .first()
    )
    if not existing_link:
        link = models.GroupCourse(
            group_id=group_id,
            course_id=course_id,
        )
        db.add(link)

    db.commit()

    for uid in newly_enrolled_user_ids:
        try:
            send_event(
                topic="notifications-events",
                key=uid,
                event_type="course_enrolled",
                payload={
                    "user_id": uid,
                    "course_id": course_id,
                    "group_id": group_id,
                },
            )
        except Exception:
            logging.exception("Failed to publish course_enrolled event for user %s", uid)

    return get_group(group_id, db, current_user)


@router.get(
    "/courses/{course_id}/participants",
    response_model=group_schema.CourseParticipantsResponse,
)
def get_course_participants(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    enrollment_rows = (
        db.query(
            models.User.id,
            models.User.name,
            models.User.email,
        )
        .join(models.Enrollment, models.Enrollment.user_id == models.User.id)
        .filter(models.Enrollment.course_id == course_id)
        .order_by(models.User.name.asc())
        .all()
    )

    if not enrollment_rows:
        return group_schema.CourseParticipantsResponse(
            courseId=course.id,
            title=course.title,
            participants=[],
        )

    user_ids = [row[0] for row in enrollment_rows]

    group_rows = (
        db.query(
            models.GroupMember.user_id,
            models.Group.id,
            models.Group.name,
        )
        .join(models.Group, models.Group.id == models.GroupMember.group_id)
        .filter(models.GroupMember.user_id.in_(user_ids))
        .all()
    )

    groups_by_user: dict[str, list[group_schema.CourseParticipantGroupInfo]] = {}
    for user_id, group_id, group_name in group_rows:
        groups_by_user.setdefault(user_id, []).append(
            group_schema.CourseParticipantGroupInfo(
                groupId=group_id,
                name=group_name,
            )
        )

    participants: list[group_schema.CourseParticipantInfo] = []
    for user_id, name, email in enrollment_rows:
        participants.append(
            group_schema.CourseParticipantInfo(
                userId=user_id,
                name=name,
                email=email,
                groups=groups_by_user.get(user_id, []),
            )
        )

    return group_schema.CourseParticipantsResponse(
        courseId=course.id,
        title=course.title,
        participants=participants,
    )


@router.patch(
    "/assignments/{assignment_id}",
    response_model=assignment_schema.AssignmentDetail,
)
def update_assignment(
    assignment_id: str,
    payload: assignment_schema.AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    assignment = (
        db.query(models.Assignment)
        .filter(models.Assignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено",
        )

    if payload.title is not None:
        assignment.title = payload.title
    if payload.description is not None:
        assignment.description = payload.description
    if payload.dueDate is not None:
        assignment.due_date = payload.dueDate
    if payload.chapterId is not None:
        if payload.chapterId == "":
            assignment.chapter_id = None
        else:
            chapter = (
                db.query(models.Chapter)
                .filter(
                    models.Chapter.id == payload.chapterId,
                    models.Chapter.course_id == assignment.course_id,
                )
                .first()
            )
            if not chapter:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Глава не относится к этому курсу",
                )
            assignment.chapter_id = payload.chapterId

    assignment.updated_at = func.now()

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment_schema.AssignmentDetail(
        id=assignment.id,
        courseId=assignment.course_id,
        chapterId=assignment.chapter_id,
        title=assignment.title,
        description=assignment.description,
        dueDate=assignment.due_date,
        createdAt=assignment.created_at,
        updatedAt=assignment.updated_at,
    )


@router.delete(
    "/assignments/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    assignment = (
        db.query(models.Assignment)
        .filter(models.Assignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено",
        )

    db.query(models.AssignmentSubmission).filter(
        models.AssignmentSubmission.assignment_id == assignment_id
    ).delete()
    db.delete(assignment)
    db.commit()
    return None

@router.put("/courses/{course_id}", response_model=course_schema.CourseResponse)
def update_course(
    course_id: str,
    course_update: course_schema.CourseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    db_course.title = course_update.title
    db_course.description = course_update.description
    db_course.image_url = course_update.imageUrl
    db_course.estimated_minutes = course_update.estimatedMinutes
    db_course.updated_at = func.now()

    existing_chapters = {str(ch.id): ch for ch in db_course.chapters}

    updated_chapter_ids = []

    for i, chapter_data in enumerate(course_update.chapters):
        chapter_id = getattr(chapter_data, "id", None)

        if chapter_id and chapter_id in existing_chapters:
            db_chapter = existing_chapters[chapter_id]
            db_chapter.title = chapter_data.title
            db_chapter.content = chapter_data.content
            db_chapter.order = i

            existing_quizzes = {str(q.id): q for q in db_chapter.quizzes}
            updated_quiz_ids = []

            for quiz_data in chapter_data.quiz:
                quiz_id = getattr(quiz_data, "id", None)

                if quiz_id and quiz_id in existing_quizzes:
                    db_quiz = existing_quizzes[quiz_id]
                    db_quiz.question = quiz_data.question
                    db_quiz.options = quiz_data.options
                    db_quiz.correct_option = quiz_data.correctOption
                    db_quiz.question_type = getattr(quiz_data, "type", "choice")
                else:
                    db_quiz = models.Quiz(
                        chapter_id=db_chapter.id,
                        question=quiz_data.question,
                        options=quiz_data.options,
                        correct_option=quiz_data.correctOption,
                        question_type=getattr(quiz_data, "type", "choice"),
                    )
                    db.add(db_quiz)

                if quiz_id:
                    updated_quiz_ids.append(quiz_id)

        else:
            db_chapter = models.Chapter(
                course_id=db_course.id,
                title=chapter_data.title,
                content=chapter_data.content,
                order=i
            )
            db.add(db_chapter)
            db.flush()

            for quiz_data in chapter_data.quiz:
                db_quiz = models.Quiz(
                    chapter_id=db_chapter.id,
                    question=quiz_data.question,
                    options=quiz_data.options,
                    correct_option=quiz_data.correctOption,
                    question_type=getattr(quiz_data, "type", "choice"),
                )
                db.add(db_quiz)
                db.add(db_quiz)

        if chapter_id:
            updated_chapter_ids.append(chapter_id)

    for chapter_id, chapter in existing_chapters.items():
        if chapter_id not in updated_chapter_ids:
            db.query(models.UserProgress).filter(models.UserProgress.chapter_id == chapter.id).delete()
            db.delete(chapter)

    db.commit()
    db.refresh(db_course)

    formatted_chapters = []
    for chapter in db_course.chapters:
        formatted_quizzes = [
            {
                "id": quiz.id,
                "question": quiz.question,
                "options": quiz.options,
                "correctOption": quiz.correct_option,
                "type": getattr(quiz, "question_type", "choice") or "choice",
            }
            for quiz in chapter.quizzes
        ]
        formatted_chapters.append({
            "id": chapter.id,
            "title": chapter.title,
            "content": chapter.content,
            "quiz": formatted_quizzes,
            "completed": False
        })

    return {
        "id": db_course.id,
        "title": db_course.title,
        "description": db_course.description,
        "imageUrl": db_course.image_url,
        "chapters": formatted_chapters,
        "progress": 0,
        "enrolled": False,
        "enrollmentCode": db_course.enrollment_code,
        "estimatedMinutes": db_course.estimated_minutes,
    }

@router.delete("/courses/{course_id}")
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    assignment_ids = [
        row[0]
        for row in db.query(models.Assignment.id).filter(
            models.Assignment.course_id == course_id
        )
    ]
    if assignment_ids:
        db.query(models.AssignmentSubmission).filter(
            models.AssignmentSubmission.assignment_id.in_(assignment_ids)
        ).delete(synchronize_session=False)
        db.query(models.Assignment).filter(
            models.Assignment.id.in_(assignment_ids)
        ).delete(synchronize_session=False)

    db.query(models.UserProgress).filter(
        models.UserProgress.course_id == course_id
    ).delete(synchronize_session=False)

    db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).delete(synchronize_session=False)

    db.query(models.GroupCourse).filter(
        models.GroupCourse.course_id == course_id
    ).delete(synchronize_session=False)

    db.query(models.Notification).filter(
        models.Notification.entity_type == "course",
        models.Notification.entity_id == course_id,
    ).delete(synchronize_session=False)

    db.delete(db_course)
    db.commit()

    return {"message": "Course deleted successfully"}


@router.get("/analytics", response_model=user_schema.AdminAnalyticsOverview)
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    total_users = db.query(models.User).count()
    total_admins = db.query(models.User).filter(models.User.role == "admin").count()
    total_students = total_users - total_admins

    total_courses = db.query(models.Course).count()
    total_chapters = db.query(models.Chapter).count()
    total_quizzes = db.query(models.Quiz).count()

    total_enrollments = db.query(models.Enrollment).count()
    total_completed_chapters = (
        db.query(models.UserProgress)
        .filter(models.UserProgress.completed == True)
        .count()
    )

    courses = db.query(models.Course).all()
    course_stats: List[user_schema.AdminCourseAnalytics] = []
    completion_rates: List[float] = []

    for course in courses:
        enrollments_count = len(course.enrollments)
        chapters_count = len(course.chapters)

        completed_chapters = (
            db.query(models.UserProgress)
            .filter(
                models.UserProgress.course_id == course.id,
                models.UserProgress.completed == True,
            )
            .count()
        )

        denominator = chapters_count * enrollments_count if chapters_count and enrollments_count else 0
        completion_rate = (completed_chapters / denominator * 100.0) if denominator else 0.0

        if denominator:
            completion_rates.append(completion_rate)

        course_stats.append(
            user_schema.AdminCourseAnalytics(
                courseId=course.id,
                title=course.title,
                totalEnrollments=enrollments_count,
                completionRate=round(completion_rate, 2),
            )
        )

    average_completion_rate = (
        round(sum(completion_rates) / len(completion_rates), 2)
        if completion_rates
        else 0.0
    )

    return user_schema.AdminAnalyticsOverview(
        totalUsers=total_users,
        totalAdmins=total_admins,
        totalStudents=total_students,
        totalCourses=total_courses,
        totalChapters=total_chapters,
        totalQuizzes=total_quizzes,
        totalEnrollments=total_enrollments,
        totalCompletedChapters=total_completed_chapters,
        averageCompletionRate=average_completion_rate,
        courses=course_stats,
    )


@router.get(
    "/analytics/courses/{course_id}/users",
    response_model=user_schema.AdminCourseUsersAnalytics,
)
def get_course_users_analytics(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    course = (
        db.query(models.Course)
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    chapters = (
        db.query(models.Chapter)
        .filter(models.Chapter.course_id == course_id)
        .order_by(models.Chapter.order.asc())
        .all()
    )
    total_chapters = len(chapters)
    chapter_title_by_order = {
        chapter.order: chapter.title for chapter in chapters
    }

    progress_subquery = (
        db.query(
            models.UserProgress.user_id.label("user_id"),
            func.count(models.UserProgress.id).label("completed_chapters"),
            func.max(models.Chapter.order).label("last_completed_order"),
        )
        .join(
            models.Chapter,
            models.Chapter.id == models.UserProgress.chapter_id,
        )
        .filter(
            models.UserProgress.course_id == course_id,
            models.UserProgress.completed == True,
        )
        .group_by(models.UserProgress.user_id)
        .subquery()
    )

    rows = (
        db.query(
            models.User.id.label("user_id"),
            models.User.name.label("name"),
            models.User.email.label("email"),
            progress_subquery.c.completed_chapters,
            progress_subquery.c.last_completed_order,
        )
        .join(
            models.Enrollment,
            models.Enrollment.user_id == models.User.id,
        )
        .outerjoin(
            progress_subquery,
            progress_subquery.c.user_id == models.User.id,
        )
        .filter(models.Enrollment.course_id == course_id)
        .order_by(models.User.name.asc())
        .all()
    )

    users_progress: List[user_schema.AdminCourseUserProgress] = []

    for row in rows:
        completed_chapters = row.completed_chapters or 0
        if total_chapters > 0:
            progress = int(
                (completed_chapters / total_chapters) * 100
            )
        else:
            progress = 0

        last_completed_order = row.last_completed_order or 0
        if total_chapters == 0:
            current_order = None
            current_title = None
        else:
            next_order = last_completed_order + 1
            if next_order > total_chapters:
                current_order = None
                current_title = None
            else:
                current_order = next_order
                current_title = chapter_title_by_order.get(next_order)

        users_progress.append(
            user_schema.AdminCourseUserProgress(
                userId=row.user_id,
                name=row.name,
                email=row.email,
                progress=progress,
                completedChapters=completed_chapters,
                currentChapterOrder=current_order,
                currentChapterTitle=current_title,
            )
        )

    return user_schema.AdminCourseUsersAnalytics(
        courseId=course.id,
        title=course.title,
        totalChapters=total_chapters,
        users=users_progress,
    )
