export type UserRole = "super_admin" | "admin" | "team_lead" | "member";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "high" | "medium" | "low";
export type NotificationType =
  | "assignment"
  | "collaboration"
  | "deadline"
  | "overdue"
  | "blocker"
  | "completion";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  team_lead_id: string | null;
  avatar_url: string | null;
  status: ProjectStatus;
  created_at: string;
  team_lead?: User;
}

export interface Task {
  id: string;
  name: string;
  project_id: string;
  created_by: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  blocker: string | null;
  progress: number;
  attachment_url: string | null;
  created_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  project?: Project;
  members?: User[];
}

export interface TaskMember {
  id: string;
  task_id: string;
  user_id: string;
  added_at: string;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read_status: boolean;
  type: NotificationType;
  task_id: string | null;
  created_at: string;
  task?: Task;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  task_id: string | null;
  project_id: string | null;
  action: string;
  created_at: string;
  user?: User;
  task?: Task;
}

export interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
}
