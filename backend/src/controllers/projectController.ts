import { Response } from 'express';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { AuthRequest } from '../types';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    const project = await Project.create({
      name,
      description,
      ownerId: req.user.id,
      members: [req.user.id],
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find projects where user is owner or member
    const projects = await Project.find({
      $or: [{ ownerId: req.user.id }, { members: req.user.id }],
    })
      .populate('ownerId', 'name email avatarUrl')
      .populate('members', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id)
      .populate('ownerId', 'name email avatarUrl')
      .populate('members', 'name email avatarUrl');

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Check authorization: must be owner or member
    const isMember = project.members.some((member) => member && member._id && member._id.toString() === req.user!.id);
    const isOwner = project.ownerId && (project.ownerId._id ? project.ownerId._id.toString() : project.ownerId.toString()) === req.user.id;

    if (!isOwner && !isMember) {
      res.status(403).json({ message: 'Not authorized to view this project' });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.ownerId.toString() !== req.user.id) {
      res.status(403).json({ message: 'Only the project owner can update project settings' });
      return;
    }

    project.name = name || project.name;
    project.description = description !== undefined ? description : project.description;

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.ownerId.toString() !== req.user.id) {
      res.status(403).json({ message: 'Only the project owner can delete this project' });
      return;
    }

    // Delete tasks associated with the project
    await Task.deleteMany({ projectId: id });
    await project.deleteOne();

    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const addProjectMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!email) {
      res.status(400).json({ message: 'Email of user to add is required' });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.ownerId.toString() !== req.user.id) {
      res.status(403).json({ message: 'Only the project owner can add members' });
      return;
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      res.status(404).json({ message: 'User not found with this email' });
      return;
    }

    const alreadyMember = project.members.some((memberId) => memberId.toString() === userToAdd.id);
    if (alreadyMember) {
      res.status(400).json({ message: 'User is already a member of this project' });
      return;
    }

    project.members.push(userToAdd._id as any);
    await project.save();

    res.json({
      message: 'Member added successfully',
      project,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};
