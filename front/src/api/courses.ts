import api from "./axios";
import { Course, Chapter, Quiz } from "../types/course";

export const getAllCourses = async () => {
  const response = await api.get<Course[]>("/courses");
  return response.data;
};

export const getUserCourses = async () => {
  const response = await api.get<Course[]>("/courses/user");
  return response.data;
};

export const getCourseById = async (id: string) => {
  const response = await api.get<Course>(`/courses/${id}`);
  return response.data;
};

export const getChapterById = async (courseId: string, chapterId: string) => {
  const response = await api.get<Chapter>(`/courses/${courseId}/chapters/${chapterId}`);
  return response.data;
};

export const markChapterCompleted = async (courseId: string, chapterId: string) => {
  const response = await api.post(`/courses/${courseId}/chapters/${chapterId}/complete`);
  return response.data;
};

export const submitQuizAnswers = async (
  courseId: string,
  chapterId: string,
  answers: Record<string, number | string>
) => {
  const response = await api.post(`/courses/${courseId}/chapters/${chapterId}/quiz`, { answers });
  return response.data;
};

export const createCourse = async (courseData: Omit<Course, "id">) => {
  const response = await api.post<Course>("/admin/courses", courseData);
  return response.data;
};

export const updateCourse = async (courseId: string, courseData: Partial<Course>) => {
  const response = await api.put<Course>(`/admin/courses/${courseId}`, courseData);
  return response.data;
};

export const deleteCourse = async (courseId: string) => {
  const response = await api.delete(`/admin/courses/${courseId}`);
  return response.data;
};

export const participateInCourse = async (courseId: string, enrollmentCode: string) => {
  const response = await api.post(`/courses/${courseId}/participate`, { enrollmentCode });
  return response.data;
};

export const enrollUserToCourse = async (courseId: string, email: string) => {
  const response = await api.post<{ success: boolean; message: string }>(
    `/admin/courses/${courseId}/enroll-user`,
    { email }
  );
  return response.data;
};
