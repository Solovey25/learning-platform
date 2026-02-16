from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    role: str

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class AdminUserResponse(UserResponse):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AdminCourseAnalytics(BaseModel):
    courseId: str
    title: str
    totalEnrollments: int
    completionRate: float


class AdminAnalyticsOverview(BaseModel):
    totalUsers: int
    totalAdmins: int
    totalStudents: int
    totalCourses: int
    totalChapters: int
    totalQuizzes: int
    totalEnrollments: int
    totalCompletedChapters: int
    averageCompletionRate: float
    courses: List[AdminCourseAnalytics]


class AdminCourseUserProgress(BaseModel):
    userId: str
    name: str
    email: EmailStr
    progress: int
    completedChapters: int
    currentChapterOrder: Optional[int] = None
    currentChapterTitle: Optional[str] = None


class AdminCourseUsersAnalytics(BaseModel):
    courseId: str
    title: str
    totalChapters: int
    users: List[AdminCourseUserProgress]


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
