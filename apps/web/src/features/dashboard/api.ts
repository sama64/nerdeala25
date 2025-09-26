import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  AttendanceRecord,
  Course,
  NotificationItem,
  StudentDetailResponse,
  StudentOverview
} from "@/types";

export async function fetchStudentOverview(params?: { courseId?: string; page?: number; size?: number }) {
  const query = new URLSearchParams();
  if (params?.courseId) query.set("course_id", params.courseId);
  if (params?.page) query.set("page", String(params.page));
  if (params?.size) query.set("size", String(params.size));

  const response = await apiGet<{
    items: StudentOverview[];
    pagination: { total: number; page: number; size: number };
    metrics: Record<string, number>;
  }>(`/api/v1/students/${query.toString() ? `?${query.toString()}` : ""}`);
  return response;
}

export async function fetchStudentDetail(studentId: string) {
  return apiGet<StudentDetailResponse>(`/api/v1/students/${studentId}`);
}

export async function fetchCourses() {
  const response = await apiGet<{ items: Course[] }>("/api/v1/courses/");
  return response.items;
}

export async function fetchNotifications(studentId?: string) {
  const qs = studentId ? `?student_id=${studentId}` : "";
  const response = await apiGet<{ items: NotificationItem[] }>(`/api/v1/notifications/${qs}`);
  return response.items;
}

export async function createNotification(payload: { student_id: string; message: string }) {
  const response = await apiPost<NotificationItem>("/api/v1/notifications/", payload);
  return response;
}

export async function updateNotificationStatus(notificationId: string, status: "read" | "sent" | "pending") {
  const response = await apiPatch<NotificationItem>(`/api/v1/notifications/${notificationId}`, { status });
  return response;
}

export async function deleteNotification(notificationId: string) {
  await apiDelete(`/api/v1/notifications/${notificationId}`);
}

export async function fetchAttendance(params?: { studentId?: string; date?: string }) {
  const query = new URLSearchParams();
  if (params?.studentId) query.set("student_id", params.studentId);
  if (params?.date) query.set("target_date", params.date);
  const response = await apiGet<{ items: AttendanceRecord[]; summary: Record<string, number> }>(
    `/api/v1/attendance/${query.toString() ? `?${query.toString()}` : ""}`
  );
  return response;
}

export async function syncClassroomCourses(accessToken: string) {
  return apiPost<{ items: Course[]; count: number }>(
    "/api/v1/classroom/sync",
    {},
    { headers: { "X-Goog-Access-Token": accessToken } }
  );
}
