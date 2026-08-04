export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  ownerId: User | string;
  members: User[];
  createdAt: string;
}

export interface Attachment {
  name: string;
  url: string;
  fileType: 'image' | 'video' | 'pdf' | 'other';
  uploadedAt: string;
}

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
  estimatedTime?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: any;
  assigneeId?: User;
  creatorId: User;
  dueDate?: string;
  attachments?: Attachment[];
  subtasks?: Subtask[];
  estimatedTime?: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  userId: User;
  text: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: 'assignment' | 'comment';
  title: string;
  message: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  userTasksCount: number;
  statusCounts: {
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  upcomingTasks: Task[];
}
