from pydantic import BaseModel, EmailStr
from typing import Optional, List


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class GroupCreate(GroupBase):
    courseId: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class GroupSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    ownerId: Optional[str] = None
    memberCount: int
    courseCount: int


class GroupMemberAddRequest(BaseModel):
    userId: Optional[str] = None
    email: Optional[EmailStr] = None


class GroupMemberInfo(BaseModel):
    userId: str
    name: str
    email: EmailStr


class GroupCourseInfo(BaseModel):
    courseId: str
    title: str


class GroupDetail(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    ownerId: Optional[str] = None
    members: List[GroupMemberInfo]
    courses: List[GroupCourseInfo]


class CourseParticipantGroupInfo(BaseModel):
    groupId: str
    name: str


class CourseParticipantInfo(BaseModel):
    userId: str
    name: str
    email: EmailStr
    groups: List[CourseParticipantGroupInfo]


class CourseParticipantsResponse(BaseModel):
    courseId: str
    title: str
    participants: List[CourseParticipantInfo]

