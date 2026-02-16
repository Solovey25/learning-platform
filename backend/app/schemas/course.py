from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class QuizBase(BaseModel):
    id: str
    question: str
    options: List[str]
    correctOption: int
    type: str = "choice"

class QuizCreate(QuizBase):
    pass

class QuizResponse(QuizBase):
    id: str

    class Config:
        from_attributes = True


class ChapterBase(BaseModel):
    id: str
    title: str
    content: str

class ChapterCreate(ChapterBase):
    quiz: List[QuizCreate]

class ChapterResponse(ChapterBase):
    id: str
    quiz: List[QuizResponse]
    completed: Optional[bool] = False

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: str
    imageUrl: str
    estimatedMinutes: Optional[int] = None

class CourseCreate(CourseBase):
    chapters: List[ChapterCreate]

class CourseUpdate(CourseBase):
    chapters: List[ChapterCreate]

class CourseResponse(CourseBase):
    id: str
    chapters: List[ChapterResponse]
    progress: Optional[int] = 0
    enrolled: Optional[bool] = False
    enrollmentCode: Optional[str] = None

    class Config:
        from_attributes = True

class QuizSubmission(BaseModel):
    answers: Dict[str, Any]


class QuizResult(BaseModel):
    score: int
    passed: bool
    correctAnswers: int
    totalQuestions: int

class EnrollmentCodeRequest(BaseModel):
    enrollmentCode: str

class EnrollmentResponse(BaseModel):
    success: bool
    message: str


class CourseEnrollUserRequest(BaseModel):
    email: str
