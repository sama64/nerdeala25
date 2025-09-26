export type Role = "admin" | "teacher" | "student" | "coordinator";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  verified: boolean;
}

export interface OnboardingState {
  completed: boolean;
  completed_at: string | null;
  selected_role: Role | null;
  whatsapp_opt_in: boolean;
  phone_e164: string | null;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentOverview {
  id: string;
  user_id: string;
  course_id: string | null;
  progress: number;
  attendance_rate: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    verified: boolean;
  };
  alerts: number;
}

export interface NotificationItem {
  id: string;
  student_id: string;
  message: string;
  status: "pending" | "sent" | "read";
  created_at: string;
}

export interface SubmissionStatus {
  id: string;
  student_id: string;
  assignment_name: string;
  due_date: string;
  status: "submitted" | "late" | "missing";
  last_update: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: "present" | "absent" | "late";
  notes?: string;
}

export interface ReportMetric {
  id: string;
  student_id: string;
  data: string;
  generated_at: string;
}

export interface StudentDetailResponse {
  student: StudentOverview & {
    notifications: NotificationItem[];
    reports: ReportMetric[];
    attendance_records: AttendanceRecord[];
  };
  attendance_summary: Record<string, number>;
  notifications_summary: Record<string, number>;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  room?: string;
  alternateLink?: string;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
}
