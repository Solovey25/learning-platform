import api from "./axios";

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  ownerId?: string | null;
  memberCount: number;
  courseCount: number;
}

export interface GroupMemberInfo {
  userId: string;
  name: string;
  email: string;
}

export interface GroupCourseInfo {
  courseId: string;
  title: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  ownerId?: string | null;
  members: GroupMemberInfo[];
  courses: GroupCourseInfo[];
}

export interface GroupCreateRequest {
  name: string;
  description?: string;
  courseId?: string | null;
}

export interface GroupUpdateRequest {
  name?: string;
  description?: string;
  status?: string;
}

export interface GroupMemberAddRequest {
  userId?: string;
  email?: string;
}

export interface CourseParticipantGroupInfo {
  groupId: string;
  name: string;
}

export interface CourseParticipantInfo {
  userId: string;
  name: string;
  email: string;
  groups: CourseParticipantGroupInfo[];
}

export interface CourseParticipantsResponse {
  courseId: string;
  title: string;
  participants: CourseParticipantInfo[];
}

export const getGroups = async (params?: {
  course_id?: string;
  owner_id?: string;
  status_filter?: string;
}) => {
  const response = await api.get<GroupSummary[]>("/admin/groups", { params });
  return response.data;
};

export const createGroup = async (data: GroupCreateRequest) => {
  const response = await api.post<GroupDetail>("/admin/groups", data);
  return response.data;
};

export const getGroupById = async (groupId: string) => {
  const response = await api.get<GroupDetail>(`/admin/groups/${groupId}`);
  return response.data;
};

export const updateGroup = async (groupId: string, data: GroupUpdateRequest) => {
  const response = await api.patch<GroupDetail>(`/admin/groups/${groupId}`, data);
  return response.data;
};

export const archiveGroup = async (groupId: string) => {
  await api.delete(`/admin/groups/${groupId}`);
};

export const addGroupMember = async (groupId: string, data: GroupMemberAddRequest) => {
  const response = await api.post<GroupDetail>(`/admin/groups/${groupId}/members`, data);
  return response.data;
};

export const removeGroupMember = async (groupId: string, userId: string) => {
  await api.delete(`/admin/groups/${groupId}/members/${userId}`);
};

export const enrollGroupToCourse = async (groupId: string, courseId: string) => {
  const response = await api.post<GroupDetail>(
    `/admin/groups/${groupId}/courses/${courseId}/enroll`,
  );
  return response.data;
};

export const getCourseParticipants = async (courseId: string) => {
  const response = await api.get<CourseParticipantsResponse>(
    `/admin/courses/${courseId}/participants`,
  );
  return response.data;
};

