from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from collections import defaultdict
from app.db.database import get_db
from app.db import models
from app.schemas import course as course_schema
from app.schemas import assignment as assignment_schema
from app.core.security import get_current_active_user, get_optional_user
from sqlalchemy import func
from app.core.kafka_producer import send_event
import logging

router = APIRouter()

@router.post("/{course_id}/participate", response_model=course_schema.EnrollmentResponse)
def participate_in_course(
    course_id: str,
    enrollment_request: course_schema.EnrollmentCodeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    existing_enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if existing_enrollment:
        return {
            "success": True,
            "message": "You are already participating in this course"
        }
    
    if course.enrollment_code.upper() != enrollment_request.enrollmentCode.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid enrollment code"
        )
    
    new_enrollment = models.Enrollment(
        user_id=current_user.id,
        course_id=course.id
    )
    db.add(new_enrollment)
    db.commit()

    try:
        send_event(
            topic="notifications-events",
            key=current_user.id,
            event_type="course_enrolled",
            payload={
                "user_id": current_user.id,
                "course_id": course.id,
            },
        )
    except Exception:
        logging.exception("Failed to publish course_enrolled event for self-enroll")

    return {
        "success": True,
        "message": "Successfully joined course"
    }

@router.get("/", response_model=List[course_schema.CourseResponse])
def get_all_courses(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    courses = db.query(models.Course).options(
        selectinload(models.Course.chapters).selectinload(models.Chapter.quizzes)
    ).all()

    if not courses:
        return []

    enrollment_by_course_id = {}
    completed_chapters_by_course_id = defaultdict(int)
    completed_chapter_ids = set()

    if current_user:
        course_ids = [course.id for course in courses]

        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.user_id == current_user.id,
            models.Enrollment.course_id.in_(course_ids)
        ).all()
        enrollment_by_course_id = {enrollment.course_id: enrollment for enrollment in enrollments}

        completed_progress = db.query(models.UserProgress).filter(
            models.UserProgress.user_id == current_user.id,
            models.UserProgress.completed == True,
            models.UserProgress.course_id.in_(course_ids)
        ).all()

        for progress in completed_progress:
            completed_chapters_by_course_id[progress.course_id] += 1
            completed_chapter_ids.add(progress.chapter_id)
    
    result = []
    for course in courses:
        enrollment = enrollment_by_course_id.get(course.id) if current_user else None
        
        progress = 0
        if current_user and enrollment:
            total_chapters = len(course.chapters)
            if total_chapters > 0:
                completed_chapters = completed_chapters_by_course_id.get(course.id, 0)
                progress = int((completed_chapters / total_chapters) * 100)
        
        formatted_chapters = []
        for chapter in course.chapters:
            chapter_completed = chapter.id in completed_chapter_ids if current_user else False
            
            formatted_quizzes = [
                {
                    "id": quiz.id,
                    "question": quiz.question,
                    "options": quiz.options,
                    "correctOption": quiz.correct_option
                }
                for quiz in chapter.quizzes
            ]
            
            formatted_chapters.append({
                "id": chapter.id,
                "title": chapter.title,
                "content": chapter.content,
                "quiz": formatted_quizzes,
                "completed": chapter_completed
            })
        
        result.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "imageUrl": course.image_url,
            "chapters": formatted_chapters,
            "progress": progress,
            "enrolled": bool(current_user and enrollment),
            "enrollmentCode": course.enrollment_code,
            "estimatedMinutes": course.estimated_minutes,
        })
    
    return result

@router.get("/user", response_model=List[course_schema.CourseResponse])
def get_user_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return get_all_courses(db, current_user)

@router.get("/{course_id}", response_model=course_schema.CourseResponse)
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course.id
    ).first()
    
    progress = 0
    if enrollment:
        total_chapters = len(course.chapters)
        if total_chapters > 0:
            completed_chapters = db.query(models.UserProgress).filter(
                models.UserProgress.user_id == current_user.id,
                models.UserProgress.course_id == course.id,
                models.UserProgress.completed == True
            ).count()
            progress = int((completed_chapters / total_chapters) * 100)
    
    formatted_chapters = []
    for chapter in course.chapters:
        chapter_completed = db.query(models.UserProgress).filter(
            models.UserProgress.user_id == current_user.id,
            models.UserProgress.chapter_id == chapter.id,
            models.UserProgress.completed == True
        ).first() is not None
        
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
            "completed": chapter_completed
        })
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "imageUrl": course.image_url,
        "chapters": formatted_chapters,
        "progress": progress,
        "enrolled": enrollment is not None,
        "enrollmentCode": course.enrollment_code if current_user.role == "admin" else None,
        "estimatedMinutes": course.estimated_minutes,
    }


@router.get(
    "/{course_id}/assignments",
    response_model=list[assignment_schema.AssignmentShort],
)
def list_assignments_for_course_for_user(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
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

    if current_user.role != "admin":
        enrollment = (
            db.query(models.Enrollment)
            .filter(
                models.Enrollment.course_id == course_id,
                models.Enrollment.user_id == current_user.id,
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нужно быть записанным на курс",
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

@router.get("/{course_id}/chapters/{chapter_id}", response_model=course_schema.ChapterResponse)
def get_chapter(
    course_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to access chapters"
        )
    
    chapter = db.query(models.Chapter).filter(
        models.Chapter.id == chapter_id,
        models.Chapter.course_id == course_id
    ).first()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )
    
    chapter_completed = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.chapter_id == chapter.id,
        models.UserProgress.completed == True
    ).first() is not None
    
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
    
    return {
        "id": chapter.id,
        "title": chapter.title,
        "content": chapter.content,
        "quiz": formatted_quizzes,
        "completed": chapter_completed
    }

@router.post("/{course_id}/chapters/{chapter_id}/complete")
def complete_chapter(
    course_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course"
        )
    
    chapter = db.query(models.Chapter).filter(
        models.Chapter.id == chapter_id,
        models.Chapter.course_id == course_id
    ).first()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )
    
    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.chapter_id == chapter_id
    ).first()
    
    if progress:
        progress.completed = True
        progress.completed_at = func.now()
    else:
        progress = models.UserProgress(
            user_id=current_user.id,
            course_id=course_id,
            chapter_id=chapter_id,
            completed=True,
            completed_at=func.now()
        )
        db.add(progress)
    
    db.commit()
    
    return {"message": "Chapter marked as completed"}

@router.post("/{course_id}/chapters/{chapter_id}/quiz", response_model=course_schema.QuizResult)
def submit_quiz(
    course_id: str,
    chapter_id: str,
    submission: course_schema.QuizSubmission,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course"
        )
    
    chapter = db.query(models.Chapter).filter(
        models.Chapter.id == chapter_id,
        models.Chapter.course_id == course_id
    ).first()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )
    
    quizzes = db.query(models.Quiz).filter(models.Quiz.chapter_id == chapter_id).all()
    if not quizzes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quizzes found for this chapter"
        )
    
    total_questions = 0
    correct_answers = 0
    
    for quiz in quizzes:
        question_type = getattr(quiz, "question_type", "choice") or "choice"
        answer = submission.answers.get(quiz.id)

        if question_type == "choice":
            options = quiz.options or []
            non_empty_options = [opt for opt in options if isinstance(opt, str) and opt.strip()]
            if len(non_empty_options) <= 1:
                continue

            total_questions += 1
            if isinstance(answer, int) and answer == quiz.correct_option:
                correct_answers += 1
        elif question_type == "text":
            options = quiz.options or []
            correct_text = None
            if isinstance(options, list) and options:
                index = quiz.correct_option if 0 <= quiz.correct_option < len(options) else 0
                correct_text = options[index]

            if not correct_text:
                continue

            if isinstance(answer, str):
                total_questions += 1
                if answer.strip().lower() == correct_text.strip().lower():
                    correct_answers += 1
    
    score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
    passed = score >= 70
    
    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.chapter_id == chapter_id
    ).first()
    
    if progress:
        progress.quiz_score = score
        if passed:
            progress.completed = True
            progress.completed_at = func.now()
    else:
        progress = models.UserProgress(
            user_id=current_user.id,
            course_id=course_id,
            chapter_id=chapter_id,
            quiz_score=score,
            completed=passed,
            completed_at=func.now() if passed else None
        )
        db.add(progress)
    
    db.commit()
    
    return {
        "score": score,
        "passed": passed,
        "correctAnswers": correct_answers,
        "totalQuestions": total_questions
    }
