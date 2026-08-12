import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../types';
import { uploadToCloudinary } from '../config/cloudinary';

// Helper to send a notification
export const notifyUser = async (
  recipientId: string,
  senderId: string,
  type: 'assignment' | 'comment',
  title: string,
  message: string,
  taskId?: string
): Promise<void> => {
  if (recipientId === senderId) return; // Don't notify self
  try {
    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      taskId,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

// Helper to check if a user is a member of the project
const checkProjectAccess = async (projectId: string, userId: string): Promise<boolean> => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  return (
    project.ownerId.toString() === userId ||
    project.members.some((memberId) => memberId.toString() === userId)
  );
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, projectId, assigneeId, dueDate, subtasks, estimatedTime } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!title || !projectId) {
      res.status(400).json({ message: 'Task title and project ID are required' });
      return;
    }

    // Verify access
    const hasAccess = await checkProjectAccess(projectId, req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to add tasks to this project' });
      return;
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      projectId,
      assigneeId: assigneeId || undefined,
      creatorId: req.user.id,
      dueDate: dueDate || undefined,
      attachments: [],
      subtasks: subtasks || [],
      estimatedTime: estimatedTime || '',
    });

    // Notify assignee if assigned
    if (task.assigneeId) {
      const sender = await User.findById(req.user.id);
      await notifyUser(
        task.assigneeId.toString(),
        req.user.id,
        'assignment',
        'New Task Assigned',
        `${sender?.name || 'A user'} assigned you to the task "${task.title}".`,
        task.id
      );
    }

    const populatedTask = await Task.findById(task.id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getProjectTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const hasAccess = await checkProjectAccess(projectId, req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to view tasks for this project' });
      return;
    }

    const tasks = await Task.find({ projectId })
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const task = await Task.findById(id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to view this task' });
      return;
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, status, priority, assigneeId, dueDate, subtasks, estimatedTime } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to update this task' });
      return;
    }

    const oldAssigneeId = task.assigneeId?.toString();

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.assigneeId = assigneeId !== undefined ? (assigneeId === '' ? undefined : assigneeId) : task.assigneeId;
    task.dueDate = dueDate !== undefined ? (dueDate === '' ? undefined : dueDate) : task.dueDate;
    if (subtasks !== undefined) task.subtasks = subtasks;
    if (estimatedTime !== undefined) task.estimatedTime = estimatedTime;

    await task.save();

    // Check if assignee changed and notify
    if (task.assigneeId && task.assigneeId.toString() !== oldAssigneeId) {
      const sender = await User.findById(req.user.id);
      await notifyUser(
        task.assigneeId.toString(),
        req.user.id,
        'assignment',
        'New Task Assigned',
        `${sender?.name || 'A user'} assigned you to the task "${task.title}".`,
        task.id
      );
    }

    const populatedTask = await Task.findById(task.id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to delete this task' });
      return;
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // 1. Get all projects where the user is an owner or member
    const projects = await Project.find({
      $or: [{ ownerId: req.user.id }, { members: req.user.id }],
    });

    const projectIds = projects.map((p) => p._id);

    // 2. Fetch all tasks associated with these projects
    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('projectId', 'name')
      .populate('assigneeId', 'name email avatarUrl')
      .sort({ dueDate: 1 });

    // 3. Compute stats
    const totalProjects = projects.length;
    const totalTasks = tasks.length;

    const statusCounts = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    const userTasksCount = tasks.filter((t) => t.assigneeId && t.assigneeId._id && t.assigneeId._id.toString() === req.user!.id).length;

    tasks.forEach((task) => {
      if (task.status in statusCounts) {
        statusCounts[task.status]++;
      }
      if (task.priority in priorityCounts) {
        priorityCounts[task.priority]++;
      }
    });

    // 4. Get upcoming tasks (incomplete tasks due in the future, sorted by closest first)
    const upcomingTasks = tasks
      .filter((task) => task.status !== 'done' && task.dueDate && new Date(task.dueDate) >= new Date())
      .slice(0, 5);

    res.json({
      totalProjects,
      totalTasks,
      userTasksCount,
      statusCounts,
      priorityCounts,
      upcomingTasks,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Upload file attachment to a task
export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Verify access
    const hasAccess = await checkProjectAccess(task.projectId.toString(), req.user.id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Not authorized to upload attachments to this task' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Identify file type
    let fileType: 'image' | 'video' | 'pdf' | 'other' = 'other';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (req.file.mimetype === 'application/pdf') {
      fileType = 'pdf';
    }

    const fileUrl = await uploadToCloudinary(req.file.buffer, 'planora/attachments');

    const newAttachment = {
      name: req.file.originalname,
      url: fileUrl,
      fileType,
      uploadedAt: new Date(),
    };

    task.attachments.push(newAttachment);
    await task.save();

    const populatedTask = await Task.findById(task.id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const generateAITask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ message: 'Please provide a task title for AI generation' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        message: 'GEMINI_API_KEY is missing in backend/.env. Please configure it to enable AI Task generation.'
      });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an expert project manager. Given a task title, analyze it and generate:
      1. A clear, professional, concise description (2-4 sentences).
      2. A recommended priority level. Must be one of: 'low', 'medium', 'high', 'urgent'.
      3. An approximate total estimated time to complete the entire task (e.g. '8 hours', '2 days').
      4. A list of 3-7 concrete, actionable subtasks to accomplish the main task, along with an approximate estimation time for each subtask (e.g. '2 hours', '45 mins').
      
      Task Title: "${title}"
      
      Return the output strictly in the following JSON format:
      {
        "description": "string",
        "priority": "low" | "medium" | "high" | "urgent",
        "estimatedTime": "string",
        "subtasks": [
          { "title": "subtask title 1", "isCompleted": false, "estimatedTime": "string" },
          { "title": "subtask title 2", "isCompleted": false, "estimatedTime": "string" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedData = JSON.parse(text);

    res.json(parsedData);
  } catch (error) {
    console.error('Failed to generate AI task:', error);
    res.status(500).json({ message: 'Failed to generate AI task content', error: (error as Error).message });
  }
};
