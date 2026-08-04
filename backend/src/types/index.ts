import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface IProject extends Document {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
}

export interface IAttachment {
  name: string;
  url: string;
  fileType: 'image' | 'video' | 'pdf' | 'other';
  uploadedAt: Date;
}

export interface ISubtask {
  title: string;
  isCompleted: boolean;
  estimatedTime?: string;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  creatorId: Types.ObjectId;
  dueDate?: Date;
  attachments: IAttachment[];
  subtasks: ISubtask[];
  estimatedTime?: string;
  createdAt: Date;
}

export interface IComment extends Document {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: 'assignment' | 'comment';
  title: string;
  message: string;
  taskId?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

// Extend Request type to include authed user
export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}
