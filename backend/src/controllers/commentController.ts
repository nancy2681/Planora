import { Response } from 'express';
import { Comment } from '../models/Comment';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { notifyUser } from './taskController';
import { AuthRequest } from '../types';

// Helper to check if a user is a member of the project
const checkProjectAccess = async (projectId: string, userId: string): Promise<boolean> => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  return (
    project.ownerId.toString() === userId ||
    project.members.some((memberId) => memberId.toString() === userId)
  );
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { taskId, text } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!taskId || !text) {
      res.status(400).json({ message: 'Task ID and comment text are required' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Verify user belongs to the project
    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to comment on this task' });
      return;
    }

    const comment = await Comment.create({
      taskId,
      userId: req.user.id,
      text,
    });

    const populatedComment = await Comment.findById(comment.id)
      .populate('userId', 'name email avatarUrl');

    // Notify task assignee or creator (if they are not the commenter)
    const commenter = await User.findById(req.user.id);
    
    // 1. Notify Assignee
    if (task.assigneeId && task.assigneeId.toString() !== req.user.id) {
      await notifyUser(
        task.assigneeId.toString(),
        req.user.id,
        'comment',
        'New Comment on Task',
        `${commenter?.name || 'A user'} commented on your assigned task "${task.title}": "${text.substring(0, 30)}..."`,
        task.id
      );
    }

    // 2. Notify Creator (if creator is not assignee, and not the commenter)
    if (task.creatorId.toString() !== req.user.id && task.creatorId.toString() !== task.assigneeId?.toString()) {
      await notifyUser(
        task.creatorId.toString(),
        req.user.id,
        'comment',
        'New Comment on Task',
        `${commenter?.name || 'A user'} commented on your created task "${task.title}": "${text.substring(0, 30)}..."`,
        task.id
      );
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getTaskComments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Verify project access
    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to view comments for this task' });
      return;
    }

    const comments = await Comment.find({ taskId })
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: 1 }); // Chronological order (oldest first)

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};
