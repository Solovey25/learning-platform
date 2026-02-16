import api from "./axios";

export interface AssignmentShort {
  id: string;
  courseId: string;
  chapterId?: string | null;
  title: string;
  dueDate?: string | null;
  createdAt: string;
}

export interface AssignmentDetail {
  id: string;
  courseId: string;
  chapterId?: string | null;
  title: string;
  description: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AssignmentCreatePayload {
  title: string;
  description: string;
  dueDate?: string | null;
  chapterId?: string | null;
}

export interface AssignmentUpdatePayload {
  title?: string;
  description?: string;
  dueDate?: string | null;
  chapterId?: string | null;
}

export interface SubmissionCreatePayload {
  repositoryUrl?: string;
  textAnswer?: string;
  attachments?: any;
}

export interface SubmissionSummary {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  createdAt: string;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

export interface SubmissionDetail {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  repositoryUrl?: string | null;
  textAnswer?: string | null;
  attachments?: any;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  gradedBy?: string | null;
  createdAt?: string | null;
}

export interface GradePayload {
  grade?: number | null;
  feedback?: string | null;
}

export interface MyAssignmentWork {
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  latestSubmissionId?: string | null;
  latestCreatedAt?: string | null;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

export interface MyAssignmentsResponse {
  items: MyAssignmentWork[];
}

export const getCourseAssignments = async (
  courseId: string
): Promise<AssignmentShort[]> => {
  const response = await api.get<AssignmentShort[]>(
    `/admin/courses/${courseId}/assignments`
  );
  return response.data;
};

export const getCourseAssignmentsForUser = async (
  courseId: string
): Promise<AssignmentShort[]> => {
  const response = await api.get<AssignmentShort[]>(
    `/courses/${courseId}/assignments`
  );
  return response.data;
};

export const createAssignment = async (
  courseId: string,
  payload: AssignmentCreatePayload
): Promise<AssignmentDetail> => {
  const response = await api.post<AssignmentDetail>(
    `/admin/courses/${courseId}/assignments`,
    payload
  );
  return response.data;
};

export const updateAssignment = async (
  assignmentId: string,
  payload: AssignmentUpdatePayload
): Promise<AssignmentDetail> => {
  const response = await api.patch<AssignmentDetail>(
    `/admin/assignments/${assignmentId}`,
    payload
  );
  return response.data;
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await api.delete(`/admin/assignments/${assignmentId}`);
};

export const getAssignment = async (
  assignmentId: string
): Promise<AssignmentDetail> => {
  const response = await api.get<AssignmentDetail>(
    `/assignments/${assignmentId}`
  );
  return response.data;
};

export const createSubmission = async (
  assignmentId: string,
  payload: SubmissionCreatePayload
): Promise<SubmissionDetail> => {
  const response = await api.post<SubmissionDetail>(
    `/assignments/${assignmentId}/submissions`,
    payload
  );
  return response.data;
};

export const getSubmissionsForAssignment = async (
  assignmentId: string
): Promise<SubmissionSummary[]> => {
  const response = await api.get<SubmissionSummary[]>(
    `/assignments/${assignmentId}/submissions`
  );
  return response.data;
};

export const getSubmission = async (
  assignmentId: string,
  submissionId: string
): Promise<SubmissionDetail> => {
  const response = await api.get<SubmissionDetail>(
    `/assignments/${assignmentId}/submissions/${submissionId}`
  );
  return response.data;
};

export const gradeSubmission = async (
  assignmentId: string,
  submissionId: string,
  payload: GradePayload
): Promise<SubmissionDetail> => {
  const response = await api.post<SubmissionDetail>(
    `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    payload
  );
  return response.data;
};

export const getMyAssignments = async (): Promise<MyAssignmentsResponse> => {
  const response = await api.get<MyAssignmentsResponse>("/users/me/assignments");
  return response.data;
};
