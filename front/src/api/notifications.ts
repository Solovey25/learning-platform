import api from "./axios";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
}

export const getNotifications = async () => {
  const response = await api.get<NotificationListResponse>("/notifications");
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get<{ count: number }>("/notifications/unread-count");
  return response.data.count;
};

export const markNotificationRead = async (id: string) => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async () => {
  await api.post("/notifications/read-all");
};

export const clearNotifications = async () => {
  await api.post("/notifications/clear");
};
