import api from "./axios";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at?: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
}

export interface AdminCourseAnalytics {
  courseId: string;
  title: string;
  totalEnrollments: number;
  completionRate: number;
}

export interface AdminAnalyticsOverview {
  totalUsers: number;
  totalAdmins: number;
  totalStudents: number;
  totalCourses: number;
  totalChapters: number;
  totalQuizzes: number;
  totalEnrollments: number;
  totalCompletedChapters: number;
  averageCompletionRate: number;
  courses: AdminCourseAnalytics[];
}

export interface AdminCourseUserProgress {
  userId: string;
  name: string;
  email: string;
  progress: number;
  completedChapters: number;
  currentChapterOrder?: number | null;
  currentChapterTitle?: string | null;
}

export interface AdminCourseUsersAnalytics {
  courseId: string;
  title: string;
  totalChapters: number;
  users: AdminCourseUserProgress[];
}

export const getUsers = async (role?: string) => {
  const params = role ? { role } : undefined;
  const response = await api.get<UserSummary[]>("/admin/users", { params });
  return response.data;
};

export const getUserById = async (userId: string) => {
  const response = await api.get<UserSummary>(`/admin/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId: string, data: UserUpdateRequest) => {
  const response = await api.patch<UserSummary>(`/admin/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  await api.delete(`/admin/users/${userId}`);
};

export const getAdminAnalytics = async () => {
  const response = await api.get<AdminAnalyticsOverview>("/admin/analytics");
  return response.data;
};

export const getAdminCourseUsersAnalytics = async (courseId: string) => {
  const response = await api.get<AdminCourseUsersAnalytics>(
    `/admin/analytics/courses/${courseId}/users`,
  );
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get<UserSummary>("/auth/me");
  return response.data;
};

export const updateMyProfile = async (data: UserUpdateRequest) => {
  const response = await api.patch<UserSummary>("/auth/me", data);
  return response.data;
};

export const changePassword = async (current_password: string, new_password: string) => {
  const response = await api.post("/auth/change-password", {
    current_password,
    new_password,
  });
  return response.data;
};
