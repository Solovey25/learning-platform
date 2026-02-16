from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.db import models
from app.schemas import assignment as assignment_schema
from app.core.security import get_current_active_user, get_admin_user
from app.core.kafka_producer import send_event


router = APIRouter()


@router.get(
    "/assignments/{assignment_id}",
    response_model=assignment_schema.AssignmentDetail,
)
def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
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


@router.post(
    "/assignments/{assignment_id}/submissions",
    status_code=status.HTTP_201_CREATED,
    response_model=assignment_schema.SubmissionDetail,
)
def create_submission(
    assignment_id: str,
    payload: assignment_schema.SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
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

    enrollment = (
        db.query(models.Enrollment)
        .filter(
            models.Enrollment.user_id == current_user.id,
            models.Enrollment.course_id == assignment.course_id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Чтобы сдавать это задание, нужно быть записанным на курс",
        )

    existing_submission = (
        db.query(models.AssignmentSubmission)
        .filter(
            models.AssignmentSubmission.assignment_id == assignment_id,
            models.AssignmentSubmission.user_id == current_user.id,
        )
        .first()
    )
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ты уже отправил работу по этому заданию. Можно только просматривать результат.",
        )

    submission = models.AssignmentSubmission(
        assignment_id=assignment_id,
        user_id=current_user.id,
        repository_url=payload.repositoryUrl,
        text_answer=payload.textAnswer,
        attachments=payload.attachments,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return assignment_schema.SubmissionDetail(
        id=submission.id,
        assignmentId=submission.assignment_id,
        userId=submission.user_id,
        userName=current_user.name,
        userEmail=current_user.email,
        repositoryUrl=submission.repository_url,
        textAnswer=submission.text_answer,
        attachments=submission.attachments,
        grade=submission.grade,
        feedback=submission.feedback,
        gradedAt=submission.graded_at,
        gradedBy=submission.graded_by,
        createdAt=submission.created_at,
    )


@router.get(
    "/assignments/{assignment_id}/submissions",
    response_model=List[assignment_schema.SubmissionSummary],
)
def list_submissions_for_assignment(
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

    rows = (
        db.query(
            models.AssignmentSubmission.id,
            models.AssignmentSubmission.assignment_id,
            models.AssignmentSubmission.user_id,
            models.User.name,
            models.AssignmentSubmission.created_at,
            models.AssignmentSubmission.grade,
            models.AssignmentSubmission.feedback,
            models.AssignmentSubmission.graded_at,
        )
        .join(
            models.User,
            models.User.id == models.AssignmentSubmission.user_id,
        )
        .filter(models.AssignmentSubmission.assignment_id == assignment_id)
        .order_by(models.AssignmentSubmission.created_at.desc())
        .all()
    )

    return [
        assignment_schema.SubmissionSummary(
            id=row[0],
            assignmentId=row[1],
            userId=row[2],
            userName=row[3],
            createdAt=row[4],
            grade=row[5],
            feedback=row[6],
            gradedAt=row[7],
        )
        for row in rows
    ]


@router.get(
    "/assignments/{assignment_id}/submissions/{submission_id}",
    response_model=assignment_schema.SubmissionDetail,
)
def get_submission(
    assignment_id: str,
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    submission = (
        db.query(models.AssignmentSubmission)
        .filter(
            models.AssignmentSubmission.id == submission_id,
            models.AssignmentSubmission.assignment_id == assignment_id,
        )
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Работа не найдена",
        )

    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой работе",
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == submission.user_id)
        .first()
    )

    return assignment_schema.SubmissionDetail(
        id=submission.id,
        assignmentId=submission.assignment_id,
        userId=submission.user_id,
        userName=user.name if user else "",
        userEmail=user.email if user else "",
        repositoryUrl=submission.repository_url,
        textAnswer=submission.text_answer,
        attachments=submission.attachments,
        grade=submission.grade,
        feedback=submission.feedback,
        gradedAt=submission.graded_at,
        gradedBy=submission.graded_by,
        createdAt=submission.created_at,
    )


@router.post(
    "/assignments/{assignment_id}/submissions/{submission_id}/grade",
    response_model=assignment_schema.SubmissionDetail,
)
def grade_submission(
    assignment_id: str,
    submission_id: str,
    payload: assignment_schema.GradeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    submission = (
        db.query(models.AssignmentSubmission)
        .filter(
            models.AssignmentSubmission.id == submission_id,
            models.AssignmentSubmission.assignment_id == assignment_id,
        )
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Работа не найдена",
        )

    submission.grade = payload.grade
    submission.feedback = payload.feedback
    submission.graded_by = current_user.id
    submission.graded_at = func.now()
    submission.updated_at = func.now()

    db.add(submission)
    db.commit()
    db.refresh(submission)

    user = (
        db.query(models.User)
        .filter(models.User.id == submission.user_id)
        .first()
    )

    try:
        send_event(
            topic="notifications-events",
            key=submission.user_id,
            event_type="assignment_graded",
            payload={
                "user_id": submission.user_id,
                "assignment_id": submission.assignment_id,
                "course_id": submission.assignment.course_id if submission.assignment else None,
                "grade": submission.grade,
                "feedback": submission.feedback,
                "graded_by": submission.graded_by,
            },
        )
    except Exception:
        pass

    return assignment_schema.SubmissionDetail(
        id=submission.id,
        assignmentId=submission.assignment_id,
        userId=submission.user_id,
        userName=user.name if user else "",
        userEmail=user.email if user else "",
        repositoryUrl=submission.repository_url,
        textAnswer=submission.text_answer,
        attachments=submission.attachments,
        grade=submission.grade,
        feedback=submission.feedback,
        gradedAt=submission.graded_at,
        gradedBy=submission.graded_by,
    )


@router.get(
    "/users/me/assignments",
    response_model=assignment_schema.MyAssignmentsResponse,
)
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    assignments = (
        db.query(
            models.Assignment.id,
            models.Assignment.title,
            models.Assignment.course_id,
            models.Course.title,
        )
        .join(models.Course, models.Course.id == models.Assignment.course_id)
        .all()
    )
    if not assignments:
        return assignment_schema.MyAssignmentsResponse(items=[])

    assignment_ids = [row[0] for row in assignments]

    subquery_latest = (
        db.query(
            models.AssignmentSubmission.assignment_id.label("assignment_id"),
            func.max(models.AssignmentSubmission.created_at).label(
                "latest_created_at"
            ),
        )
        .filter(models.AssignmentSubmission.user_id == current_user.id)
        .filter(
            models.AssignmentSubmission.assignment_id.in_(assignment_ids)
        )
        .group_by(models.AssignmentSubmission.assignment_id)
        .subquery()
    )

    rows = (
        db.query(
            models.Assignment.id,
            models.Assignment.title,
            models.Assignment.course_id,
            models.Course.title,
            models.AssignmentSubmission.id,
            models.AssignmentSubmission.created_at,
            models.AssignmentSubmission.grade,
            models.AssignmentSubmission.feedback,
            models.AssignmentSubmission.graded_at,
        )
        .join(models.Course, models.Course.id == models.Assignment.course_id)
        .outerjoin(
            subquery_latest,
            subquery_latest.c.assignment_id == models.Assignment.id,
        )
        .outerjoin(
            models.AssignmentSubmission,
            (models.AssignmentSubmission.assignment_id == models.Assignment.id)
            & (
                models.AssignmentSubmission.created_at
                == subquery_latest.c.latest_created_at
            ),
        )
        .filter(
            (subquery_latest.c.assignment_id != None)
            | (
                models.Assignment.course_id.in_(
                    db.query(models.Enrollment.course_id).filter(
                        models.Enrollment.user_id == current_user.id
                    )
                )
            )
        )
        .all()
    )

    items: List[assignment_schema.MyAssignmentWork] = []

    for row in rows:
        items.append(
            assignment_schema.MyAssignmentWork(
                assignmentId=row[0],
                assignmentTitle=row[1],
                courseId=row[2],
                courseTitle=row[3],
                latestSubmissionId=row[4],
                latestCreatedAt=row[5],
                grade=row[6],
                feedback=row[7],
                gradedAt=row[8],
            )
        )

    return assignment_schema.MyAssignmentsResponse(items=items)
