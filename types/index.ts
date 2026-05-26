export type UserRole = "super_admin" | "admin" | "team_lead" | "member";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "high" | "medium" | "low";
export type LearningType = "book" | "course" | "video" | "podcast" | "article" | "other";
export type LearningStatus = "not_started" | "in_progress" | "completed";
export type LearningCadre = "personal_cognitive" | "industry_context" | "technical_mastery";
export type LearningMaterialStatus = "not_started" | "started" | "completed";
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

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  brand_manager_id: string | null;
  created_at: string;
  brand_manager?: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  team_lead_id: string | null;
  avatar_url: string | null;
  brand_id: string | null;
  status: ProjectStatus;
  created_at: string;
  team_lead?: User;
  brand?: Brand;
}

export interface Task {
  id: string;
  name: string;
  description: string | null;
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

export interface LearningPath {
  id: string;
  user_id: string;
  title: string;
  type: LearningType;
  description: string | null;
  url: string | null;
  progress: number;
  status: LearningStatus;
  brand_id: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  user?: User;
  brand?: Brand;
}

export interface LearningMaterial {
  id: string;
  user_id: string;
  title: string;
  type: LearningType;
  cadre: LearningCadre;
  status: LearningMaterialStatus;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  url: string | null;
  notes: string | null;
  created_at: string;
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
