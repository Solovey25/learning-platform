from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid
import secrets
import string

def generate_uuid():
    return str(uuid.uuid4())

def generate_enrollment_code():
    """Generate a random 8-character enrollment code"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    enrollments = relationship("Enrollment", back_populates="user")
    progress = relationship("UserProgress", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=False)
    enrollment_code = Column(String, nullable=False, default=generate_enrollment_code, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    estimated_minutes = Column(Integer, nullable=True)

    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course")

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String, primary_key=True, default=generate_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    course = relationship("Course", back_populates="chapters")
    quizzes = relationship("Quiz", back_populates="chapter", cascade="all, delete-orphan")
    progress = relationship("UserProgress", back_populates="chapter")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=generate_uuid)
    chapter_id = Column(String, ForeignKey("chapters.id"), nullable=False)
    question = Column(String, nullable=False)
    options = Column(JSON, nullable=False) 
    correct_option = Column(Integer, nullable=False)
    question_type = Column(String, nullable=False, default="choice")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    chapter = relationship("Chapter", back_populates="quizzes")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    chapter_id = Column(String, ForeignKey("chapters.id"), nullable=False)
    completed = Column(Boolean, default=False)
    quiz_score = Column(Integer, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="progress")
    chapter = relationship("Chapter", back_populates="progress")


class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    owner = relationship("User")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    courses = relationship("GroupCourse", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="members")
    user = relationship("User")


class GroupCourse(Base):
    __tablename__ = "group_courses"

    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="courses")
    course = relationship("Course")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=generate_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    chapter_id = Column(String, ForeignKey("chapters.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    course = relationship("Course")
    chapter = relationship("Chapter")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    assignment_id = Column(String, ForeignKey("assignments.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    repository_url = Column(String, nullable=True)
    text_answer = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)
    grade = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("Assignment")
    user = relationship("User", foreign_keys=[user_id])
    graded_by_user = relationship("User", foreign_keys=[graded_by])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notifications")
