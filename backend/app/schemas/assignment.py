from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel


class AssignmentBase(BaseModel):
    title: str
    description: str
    dueDate: Optional[datetime] = None
    chapterId: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    dueDate: Optional[datetime] = None
    chapterId: Optional[str] = None


class AssignmentShort(BaseModel):
    id: str
    courseId: str
    chapterId: Optional[str] = None
    title: str
    dueDate: Optional[datetime] = None
    createdAt: datetime


class AssignmentDetail(BaseModel):
    id: str
    courseId: str
    chapterId: Optional[str] = None
    title: str
    description: str
    dueDate: Optional[datetime] = None
    createdAt: datetime
    updatedAt: Optional[datetime] = None


class SubmissionCreate(BaseModel):
    repositoryUrl: Optional[str] = None
    textAnswer: Optional[str] = None
    attachments: Optional[Any] = None


class SubmissionSummary(BaseModel):
    id: str
    assignmentId: str
    userId: str
    userName: str
    createdAt: datetime
    grade: Optional[int] = None
    feedback: Optional[str] = None
    gradedAt: Optional[datetime] = None


class SubmissionDetail(BaseModel):
    id: str
    assignmentId: str
    userId: str
    userName: str
    userEmail: str
    repositoryUrl: Optional[str] = None
    textAnswer: Optional[str] = None
    attachments: Optional[Any] = None
    grade: Optional[int] = None
    feedback: Optional[str] = None
    gradedAt: Optional[datetime] = None
    gradedBy: Optional[str] = None
    createdAt: Optional[datetime] = None


class GradeRequest(BaseModel):
    grade: Optional[int] = None
    feedback: Optional[str] = None


class MyAssignmentWork(BaseModel):
    assignmentId: str
    assignmentTitle: str
    courseId: str
    courseTitle: str
    latestSubmissionId: Optional[str] = None
    latestCreatedAt: Optional[datetime] = None
    grade: Optional[int] = None
    feedback: Optional[str] = None
    gradedAt: Optional[datetime] = None


class MyAssignmentsResponse(BaseModel):
    items: List[MyAssignmentWork]
