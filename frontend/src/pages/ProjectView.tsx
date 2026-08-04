import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getAvatarUrl } from '../services/api';
import type { Project, Task, User, Comment, Subtask } from '../types';
import { Modal } from '../components/Modal';
import { 
  Plus, 
  UserPlus, 
  Trash2, 
  Kanban, 
  ListTodo, 
  Calendar, 
  Loader2, 
  Info,
  MessageSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProjectView: React.FC = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'list'>('board');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Attachments state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // New task form fields
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<Subtask[]>([]);
  const [newTaskEstimatedTime, setNewTaskEstimatedTime] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // Edit task form fields (in-view)
  const [editTaskStatus, setEditTaskStatus] = useState<string>('');
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('');
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false);
  const [editTaskTitle, setEditTaskTitle] = useState<string>('');
  const [editTaskDesc, setEditTaskDesc] = useState<string>('');
  const [editTaskPriority, setEditTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>('');

  // Invite user fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      const tasksRes = await api.get(`/tasks/project/${projectId}`);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching project data:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'todo' | 'in_progress' | 'in_review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks(tasks.map(task => task._id === taskId ? { ...task, status: newStatus } : task));

    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
      setTasks(previousTasks); // Rollback on error
    }
  };

  // Task CRUD operations
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    if (newTaskDueDate && newTaskDueDate < getTodayDateString()) {
      alert('Due date cannot be in the past');
      return;
    }

    try {
      const response = await api.post('/tasks', {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        projectId,
        assigneeId: newTaskAssignee || undefined,
        dueDate: newTaskDueDate || undefined,
        subtasks: newTaskSubtasks,
        estimatedTime: newTaskEstimatedTime,
      });

      setTasks([response.data, ...tasks]);
      setIsNewTaskModalOpen(false);
      resetNewTaskForm();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const resetNewTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('medium');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskSubtasks([]);
    setNewTaskEstimatedTime('');
    setAiError('');
  };

  const handleAIGenerate = async () => {
    if (!newTaskTitle.trim()) {
      setAiError('Please enter a task title first.');
      return;
    }

    setIsGeneratingAI(true);
    setAiError('');

    try {
      const response = await api.post('/tasks/ai-generate', { title: newTaskTitle });
      const { description, priority, subtasks, estimatedTime } = response.data;
      
      if (description) setNewTaskDesc(description);
      if (priority) setNewTaskPriority(priority);
      if (subtasks) setNewTaskSubtasks(subtasks);
      if (estimatedTime) setNewTaskEstimatedTime(estimatedTime);
    } catch (error: any) {
      console.error('AI Task generation failed:', error);
      setAiError(error.response?.data?.message || 'Failed to generate content. Please make sure GEMINI_API_KEY is configured.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleToggleNewSubtask = (index: number) => {
    setNewTaskSubtasks(
      newTaskSubtasks.map((sub, idx) =>
        idx === index ? { ...sub, isCompleted: !sub.isCompleted } : sub
      )
    );
  };

  const handleAddCustomNewSubtask = (title: string) => {
    if (!title.trim()) return;
    setNewTaskSubtasks([...newTaskSubtasks, { title: title.trim(), isCompleted: false }]);
  };

  const handleRemoveNewSubtask = (index: number) => {
    setNewTaskSubtasks(newTaskSubtasks.filter((_, idx) => idx !== index));
  };

  const handleToggleTaskSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks?.map(sub =>
      sub._id === subtaskId ? { ...sub, isCompleted: !sub.isCompleted } : sub
    ) || [];

    // Optimistic UI update
    const previousTask = { ...selectedTask };
    setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks });
    setTasks(tasks.map(t => t._id === selectedTask._id ? { ...t, subtasks: updatedSubtasks } : t));

    try {
      const response = await api.put(`/tasks/${selectedTask._id}`, { subtasks: updatedSubtasks });
      setSelectedTask(response.data);
      setTasks(tasks.map(t => t._id === selectedTask._id ? response.data : t));
    } catch (error) {
      console.error('Failed to update subtask:', error);
      setSelectedTask(previousTask);
      setTasks(tasks.map(t => t._id === selectedTask._id ? previousTask : t));
    }
  };

  const fetchComments = async (taskId: string) => {
    setIsLoadingComments(true);
    try {
      const response = await api.get(`/comments/task/${taskId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;
    try {
      const response = await api.post('/comments', {
        taskId: selectedTask._id,
        text: newCommentText.trim(),
      });
      setComments(prevComments => [...prevComments, response.data]);
      setNewCommentText('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const getAttachmentIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon size={16} style={{ color: 'var(--accent)' }} />;
      case 'pdf':
        return <FileText size={16} style={{ color: 'var(--priority-urgent)' }} />;
      default:
        return <File size={16} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const getAttachmentUrl = (url: string) => {
    const baseUrl = api.defaults.baseURL || 'http://localhost:5001/api';
    const hostUrl = baseUrl.replace('/api', '');
    return `${hostUrl}${url}`;
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTask) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAttachment(true);
    try {
      const response = await api.post(`/tasks/${selectedTask._id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTasks(tasks.map(t => t._id === selectedTask._id ? response.data : t));
      setSelectedTask(response.data);
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      alert('Failed to upload attachment. Please try again.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setEditTaskStatus(task.status);
    setEditTaskAssignee(task.assigneeId?._id || '');
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : '');
    setIsEditingTask(false);
    setIsTaskModalOpen(true);
    fetchComments(task._id);
  };

  const handleUpdateTaskDetail = async (statusVal: string, assigneeVal: string) => {
    if (!selectedTask) return;
    try {
      const response = await api.put(`/tasks/${selectedTask._id}`, {
        status: statusVal,
        assigneeId: assigneeVal || '',
      });

      setTasks(tasks.map(t => t._id === selectedTask._id ? response.data : t));
      setSelectedTask(response.data);
    } catch (error) {
      console.error('Error updating task detail:', error);
    }
  };

  const handleSaveTaskEdits = async () => {
    if (!selectedTask) return;

    if (editTaskDueDate && editTaskDueDate < getTodayDateString()) {
      alert('Due date cannot be in the past');
      return;
    }
    try {
      const response = await api.put(`/tasks/${selectedTask._id}`, {
        title: editTaskTitle,
        description: editTaskDesc,
        status: editTaskStatus,
        priority: editTaskPriority,
        assigneeId: editTaskAssignee || '',
        dueDate: editTaskDueDate || '',
      });

      setTasks(tasks.map(t => t._id === selectedTask._id ? response.data : t));
      setSelectedTask(response.data);
      setIsEditingTask(false);
    } catch (error) {
      console.error('Error saving task edits:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const confirmName = window.prompt(`Type the project name "${project.name}" to delete it:`);
    if (confirmName !== project.name) return;

    try {
      await api.delete(`/projects/${project._id}`);
      navigate('/dashboard');
      // Trigger full page reload to refresh sidebar
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail) return;

    try {
      await api.post(`/projects/${projectId}/members`, { email: inviteEmail });
      setInviteSuccess('Member added successfully!');
      setInviteEmail('');
      // Reload project details to show new member in the list
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);
    } catch (error: any) {
      setInviteError(error.response?.data?.message || 'Failed to add user to project');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} className="spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
        <span style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading Project Boards...</span>
      </div>
    );
  }

  if (!project) return <div style={styles.container}>Project not found.</div>;

  const isOwner = project.ownerId 
    ? (typeof project.ownerId === 'string' ? project.ownerId === user?._id : (project.ownerId as User)._id === user?._id)
    : false;

  // Filter tasks into columns
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const inReviewTasks = tasks.filter(t => t.status === 'in_review');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div style={styles.container} className="fade-in">
      {/* Top Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.projectBreadcrumb}>
            <span>Projects</span> / <span>{project.name}</span>
          </div>
          <h1 style={styles.title}>{project.name}</h1>
          <p style={styles.subtitle}>{project.description || 'No description provided.'}</p>
        </div>

        <div style={styles.actions}>
          {isOwner && (
            <button onClick={() => setIsInviteModalOpen(true)} style={styles.secondaryButton}>
              <UserPlus size={16} />
              <span>Add Member</span>
            </button>
          )}

          <button onClick={() => setIsNewTaskModalOpen(true)} style={styles.primaryButton}>
            <Plus size={16} />
            <span>New Task</span>
          </button>

          {isOwner && (
            <button onClick={handleDeleteProject} style={styles.dangerButton} title="Delete Project">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Meta Row */}
      <div style={styles.metaRow}>
        <div style={styles.tabGroup}>
          <button 
            onClick={() => setActiveTab('board')} 
            style={{ ...styles.tabButton, ...(activeTab === 'board' ? styles.tabButtonActive : {}) }}
          >
            <Kanban size={16} />
            <span>Kanban Board</span>
          </button>
          <button 
            onClick={() => setActiveTab('list')} 
            style={{ ...styles.tabButton, ...(activeTab === 'list' ? styles.tabButtonActive : {}) }}
          >
            <ListTodo size={16} />
            <span>List View</span>
          </button>
        </div>

        {/* Member Avatars */}
        <div style={styles.membersMeta}>
          <span style={styles.membersLabel}>Team:</span>
          <div style={styles.avatarGroup}>
            {project.members.filter(Boolean).map((member) => (
              <img 
                key={member._id} 
                src={getAvatarUrl(member.avatarUrl)} 
                alt={member.name} 
                style={styles.memberAvatar} 
                title={`${member.name} (${member.email})`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Board Tab View */}
      {activeTab === 'board' && (
        <div style={styles.boardGrid}>
          {/* Column To Do */}
          <div 
            style={styles.boardColumn} 
            className="glass-panel"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'todo')}
          >
            <div style={styles.columnHeader}>
              <span style={{ ...styles.columnIndicator, backgroundColor: 'var(--status-todo)' }} />
              <span style={styles.columnName}>To Do</span>
              <span style={styles.columnCount}>{todoTasks.length}</span>
            </div>
            <div style={styles.columnBody}>
              {todoTasks.map(task => (
                <TaskCard key={task._id} task={task} onDragStart={handleDragStart} onClick={handleOpenTaskDetails} />
              ))}
            </div>
          </div>

          {/* Column In Progress */}
          <div 
            style={styles.boardColumn} 
            className="glass-panel"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'in_progress')}
          >
            <div style={styles.columnHeader}>
              <span style={{ ...styles.columnIndicator, backgroundColor: 'var(--status-in-progress)' }} />
              <span style={styles.columnName}>In Progress</span>
              <span style={styles.columnCount}>{inProgressTasks.length}</span>
            </div>
            <div style={styles.columnBody}>
              {inProgressTasks.map(task => (
                <TaskCard key={task._id} task={task} onDragStart={handleDragStart} onClick={handleOpenTaskDetails} />
              ))}
            </div>
          </div>

          {/* Column In Review */}
          <div 
            style={styles.boardColumn} 
            className="glass-panel"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'in_review')}
          >
            <div style={styles.columnHeader}>
              <span style={{ ...styles.columnIndicator, backgroundColor: 'var(--status-in-review)' }} />
              <span style={styles.columnName}>In Review</span>
              <span style={styles.columnCount}>{inReviewTasks.length}</span>
            </div>
            <div style={styles.columnBody}>
              {inReviewTasks.map(task => (
                <TaskCard key={task._id} task={task} onDragStart={handleDragStart} onClick={handleOpenTaskDetails} />
              ))}
            </div>
          </div>

          {/* Column Done */}
          <div 
            style={styles.boardColumn} 
            className="glass-panel"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <div style={styles.columnHeader}>
              <span style={{ ...styles.columnIndicator, backgroundColor: 'var(--status-done)' }} />
              <span style={styles.columnName}>Done</span>
              <span style={styles.columnCount}>{doneTasks.length}</span>
            </div>
            <div style={styles.columnBody}>
              {doneTasks.map(task => (
                <TaskCard key={task._id} task={task} onDragStart={handleDragStart} onClick={handleOpenTaskDetails} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List Tab View */}
      {activeTab === 'list' && (
        <div style={styles.listContainer} className="glass-panel">
          {tasks.length === 0 ? (
            <div style={styles.emptyTasksList}>No tasks found in this project.</div>
          ) : (
            <div style={styles.listTable}>
              <div style={styles.listHeaderRow}>
                <div style={{ ...styles.listHeaderCell, flex: 3 }}>Task Name</div>
                <div style={{ ...styles.listHeaderCell, flex: 1 }}>Status</div>
                <div style={{ ...styles.listHeaderCell, flex: 1 }}>Priority</div>
                <div style={{ ...styles.listHeaderCell, flex: 1.5 }}>Assignee</div>
                <div style={{ ...styles.listHeaderCell, flex: 1.5 }}>Due Date</div>
              </div>

              {tasks.map(task => (
                <div key={task._id} style={styles.listRow} className="list-row" onClick={() => handleOpenTaskDetails(task)}>
                  <div style={{ ...styles.listCell, flex: 3, fontWeight: 600 }}>{task.title}</div>
                  <div style={{ ...styles.listCell, flex: 1 }}>
                    <span style={{
                      ...styles.statusTag,
                      backgroundColor: `var(--status-${task.status}-bg)`,
                      color: `var(--status-${task.status})`
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ ...styles.listCell, flex: 1 }}>
                    <span style={{
                      ...styles.priorityTag,
                      color: `var(--priority-${task.priority})`
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  <div style={{ ...styles.listCell, flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {task.assigneeId ? (
                      <>
                        <img src={getAvatarUrl(task.assigneeId.avatarUrl)} alt="Assignee" style={styles.taskCardAvatar} />
                        <span style={styles.assigneeText}>{task.assigneeId.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unassigned</span>
                    )}
                  </div>
                  <div style={{ ...styles.listCell, flex: 1.5, color: 'var(--text-secondary)' }}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Task */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => { setIsNewTaskModalOpen(false); resetNewTaskForm(); }} title="Create New Task">
        <form onSubmit={handleCreateTask} style={styles.modalForm}>
          <div style={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={styles.label}>Task Title</label>
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGeneratingAI || !newTaskTitle.trim()}
                style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'opacity 0.2s',
                  opacity: isGeneratingAI || !newTaskTitle.trim() ? 0.6 : 1,
                }}
              >
                {isGeneratingAI ? 'Generating...' : '✨ Generate with AI'}
              </button>
            </div>
            <input 
              type="text" 
              placeholder="E.g. Design Landing Page" 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              style={styles.input}
              required
            />
            {aiError && (
              <span style={{ fontSize: '11px', color: 'var(--priority-urgent)', marginTop: '4px' }}>
                {aiError}
              </span>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea 
              placeholder="Provide a detailed description of the task..." 
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              style={styles.textarea}
              rows={3}
            />
          </div>

          {/* AI Subtasks Preview List */}
          {newTaskSubtasks.length > 0 && (
            <div style={{ ...styles.inputGroup, marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={styles.label}>AI Suggested Subtasks</label>
                <button
                  type="button"
                  onClick={() => setNewTaskSubtasks([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {newTaskSubtasks.map((sub, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <input 
                        type="checkbox" 
                        checked={sub.isCompleted} 
                        onChange={() => handleToggleNewSubtask(idx)}
                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={sub.title}
                        onChange={(e) => {
                          const updated = [...newTaskSubtasks];
                          updated[idx].title = e.target.value;
                          setNewTaskSubtasks(updated);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                          flex: 1,
                          padding: '2px 0',
                          borderBottom: '1px solid transparent',
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = 'var(--border-color)'}
                        onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                      />
                      <input
                        type="text"
                        placeholder="Est (e.g. 1h)"
                        value={sub.estimatedTime || ''}
                        onChange={(e) => {
                          const updated = [...newTaskSubtasks];
                          updated[idx].estimatedTime = e.target.value;
                          setNewTaskSubtasks(updated);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          outline: 'none',
                          width: '90px',
                          textAlign: 'right',
                          padding: '2px 0',
                          borderBottom: '1px solid transparent',
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = 'var(--border-color)'}
                        onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewSubtask(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--priority-urgent)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                
                {/* Add Custom Subtask Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                  <input
                    type="text"
                    placeholder="+ Add custom subtask..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomNewSubtask((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      outline: 'none',
                      flex: 1,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={styles.formRow}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Priority</label>
              <select 
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                style={styles.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Due Date</label>
              <input 
                type="date" 
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                style={styles.input}
                min={getTodayDateString()}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Assignee</label>
              <select 
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                style={styles.select}
              >
                <option value="">Unassigned</option>
                {project.members.filter(Boolean).map((member) => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Estimated Duration</label>
              <input 
                type="text" 
                placeholder="E.g. 8 hours, 3 days"
                value={newTaskEstimatedTime}
                onChange={(e) => setNewTaskEstimatedTime(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setIsNewTaskModalOpen(false)} style={styles.modalSecondaryButton}>Cancel</button>
            <button type="submit" style={styles.modalPrimaryButton}>Create Task</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Invite Member */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInviteMember} style={styles.modalForm}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Add a team member to collaboration workspaces using their email address.
          </p>

          {inviteError && <div style={styles.errorAlert}>{inviteError}</div>}
          {inviteSuccess && <div style={styles.successAlert}>{inviteSuccess}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="collaborator@example.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setIsInviteModalOpen(false)} style={styles.modalSecondaryButton}>Close</button>
            <button type="submit" style={styles.modalPrimaryButton}>Add Member</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Task Details & Edits */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Task Insights">
        {selectedTask && (
          isEditingTask ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveTaskEdits(); }} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Task Title</label>
                <input 
                  type="text" 
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Description</label>
                <textarea 
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  style={styles.textarea}
                  rows={4}
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select 
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value)}
                    style={styles.select}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Priority</label>
                  <select 
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                    style={styles.select}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Assignee</label>
                  <select 
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Unassigned</option>
                    {project.members.filter(Boolean).map((member) => (
                      <option key={member._id} value={member._id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Due Date</label>
                  <input 
                    type="date" 
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                    style={styles.input}
                    min={getTodayDateString()}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsEditingTask(false)} style={styles.modalSecondaryButton}>Cancel</button>
                <button type="submit" style={styles.modalPrimaryButton}>Save Changes</button>
              </div>
            </form>
          ) : (
            <div style={styles.modalForm}>
              <div style={styles.detailTitleRow}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedTask.title}</h2>
                <span style={{
                  ...styles.priorityTag,
                  borderColor: `var(--priority-${selectedTask.priority})`,
                  color: `var(--priority-${selectedTask.priority})`,
                  border: '1px solid',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                }}>
                  {selectedTask.priority}
                </span>
              </div>

              {selectedTask.estimatedTime && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.25)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, marginTop: '8px', marginBottom: '8px' }}>
                  <span>⏳ Est. Duration:</span>
                  <strong>{selectedTask.estimatedTime}</strong>
                </div>
              )}

              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-line', margin: '16px 0' }}>
                {selectedTask.description || 'No description provided for this task.'}
              </p>

              {selectedTask.dueDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--priority-high)', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
                  <Calendar size={14} />
                  <span>Due by {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* Subtasks Checklist Section */}
              <div style={{ marginBottom: '20px', marginTop: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Subtasks</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedTask.subtasks?.filter(s => s.isCompleted).length || 0} of {selectedTask.subtasks?.length || 0} completed
                  </span>
                </h4>
                {!selectedTask.subtasks || selectedTask.subtasks.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>No subtasks defined.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                    {selectedTask.subtasks.map((sub) => (
                      <label 
                        key={sub._id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          cursor: 'pointer', 
                          fontSize: '13px',
                          color: sub.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: sub.isCompleted ? 'line-through' : 'none',
                          transition: 'color 0.2s',
                          padding: '6px 10px',
                          borderRadius: 'var(--border-radius-sm)',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid transparent',
                        }}
                        className="subtask-item-label"
                      >
                        <input 
                          type="checkbox" 
                          checked={sub.isCompleted} 
                          onChange={() => handleToggleTaskSubtask(sub._id || '')}
                          style={{
                            cursor: 'pointer',
                            accentColor: 'var(--primary)',
                            width: '14px',
                            height: '14px',
                          }}
                        />
                        <span style={{ flex: 1 }}>{sub.title}</span>
                        {sub.estimatedTime && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                            {sub.estimatedTime}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

              {/* Editing quick settings */}
              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select 
                    value={editTaskStatus}
                    onChange={(e) => {
                      setEditTaskStatus(e.target.value);
                      handleUpdateTaskDetail(e.target.value, editTaskAssignee);
                    }}
                    style={styles.select}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Assignee</label>
                  <select 
                    value={editTaskAssignee}
                    onChange={(e) => {
                      setEditTaskAssignee(e.target.value);
                      handleUpdateTaskDetail(editTaskStatus, e.target.value);
                    }}
                    style={styles.select}
                  >
                    <option value="">Unassigned</option>
                    {project.members.filter(Boolean).map((member) => (
                      <option key={member._id} value={member._id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginTop: '16px' }}>
                <Info size={14} />
                <span>Created by {selectedTask.creatorId?.name || 'Deleted User'} on {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

              {/* Attachments Section */}
              <div style={styles.attachmentsSection}>
                <div style={styles.attachmentsHeader}>
                  <h3 style={styles.attachmentsTitle}>
                    <Paperclip size={15} />
                    Attachments ({selectedTask.attachments?.length || 0})
                  </h3>
                </div>

                <div style={styles.attachmentsList}>
                  {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                    <div style={styles.noAttachments}>No attachments uploaded yet</div>
                  ) : (
                    selectedTask.attachments.map((att, idx) => (
                      <div key={idx} style={styles.attachmentCard}>
                        <div style={styles.attachmentInfo}>
                          {getAttachmentIcon(att.fileType)}
                          <a 
                            href={getAttachmentUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.attachmentName}
                            title="Open attachment in new tab"
                          >
                            {att.name}
                          </a>
                        </div>
                        <a 
                          href={getAttachmentUrl(att.url)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.attachmentDownloadBtn}
                          title="Download file"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <div style={styles.uploadArea}>
                  <label style={styles.uploadLabel}>
                    <Upload size={14} />
                    <span>Upload File</span>
                    <input 
                      type="file" 
                      onChange={handleUploadAttachment} 
                      style={{ display: 'none' }}
                      disabled={isUploadingAttachment}
                    />
                  </label>
                  {isUploadingAttachment && (
                    <span style={styles.uploadProgress}>Uploading...</span>
                  )}
                </div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />

              {/* Discussion / Comments Section */}
              <div style={styles.commentsSection}>
                <div style={styles.commentsHeader}>
                  <h3 style={styles.commentsTitle}>
                    <MessageSquare size={16} />
                    Discussion ({comments.length})
                  </h3>
                </div>

                <div style={styles.commentsList}>
                  {isLoadingComments ? (
                    <div style={styles.commentsLoading}>Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div style={styles.noComments}>No comments yet. Start the conversation!</div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment._id} style={styles.commentCard}>
                        <div style={styles.commentHeader}>
                          <div style={styles.commentAuthorGroup}>
                            <div style={styles.commentAvatar}>
                              {comment.userId.name ? comment.userId.name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                            <span style={styles.commentAuthor}>{comment.userId.name}</span>
                          </div>
                          <span style={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <div style={styles.commentText}>{comment.text}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} style={styles.addCommentForm}>
                  <textarea
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={styles.commentInput}
                    rows={2}
                    required
                  />
                  <button type="submit" style={styles.commentSubmitButton}>
                    Send
                  </button>
                </form>
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => handleDeleteTask(selectedTask._id)} 
                  style={styles.modalDangerButton}
                >
                  <Trash2 size={16} />
                  <span>Delete Task</span>
                </button>
                <button type="button" onClick={() => setIsEditingTask(true)} style={styles.modalSecondaryButton}>Edit Task</button>
                <button type="button" onClick={() => setIsTaskModalOpen(false)} style={styles.modalPrimaryButton}>Close</button>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

// Component: Individual Task Card inside Kanban Board
interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onClick }) => {
  return (
    <div 
      style={cardStyles.card} 
      draggable
      onDragStart={(e) => onDragStart(e, task._id)}
      onClick={() => onClick(task)}
    >
      <span style={{
        ...cardStyles.priorityDot,
        backgroundColor: `var(--priority-${task.priority})`
      }} title={`Priority: ${task.priority}`} />
      
      <h4 style={cardStyles.title}>{task.title}</h4>
      {task.description && <p style={cardStyles.description}>{task.description}</p>}

      <div style={cardStyles.metaRow}>
        <div style={cardStyles.dueDateWrapper}>
          {task.dueDate && (
            <>
              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={cardStyles.dueDateVal}>
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>

        <div style={cardStyles.avatarWrapper}>
          {task.assigneeId ? (
            <img 
              src={getAvatarUrl(task.assigneeId.avatarUrl)} 
              alt={task.assigneeId.name} 
              style={cardStyles.avatar} 
              title={`Assigned to ${task.assigneeId.name}`}
            />
          ) : (
            <div style={cardStyles.unassigned} title="Unassigned">-</div>
          )}
        </div>
      </div>
    </div>
  );
};

const cardStyles = {
  card: {
    padding: '16px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  priorityDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
  } as React.CSSProperties,
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: '1.4',
  } as React.CSSProperties,
  description: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: '1.4',
  } as React.CSSProperties,
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '6px',
  } as React.CSSProperties,
  dueDateWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  dueDateVal: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  avatarWrapper: {
    display: 'flex',
  } as React.CSSProperties,
  avatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    objectFit: 'cover',
  } as React.CSSProperties,
  unassigned: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-muted)',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--border-color)',
  } as React.CSSProperties,
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  loadingContainer: {
    height: 'calc(100vh - var(--header-height))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
  },
  projectBreadcrumb: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    padding: '10px 16px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '10px 16px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 500,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  dangerButton: {
    padding: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--priority-urgent)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--border-radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  tabGroup: {
    display: 'flex',
    gap: '8px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  },
  membersMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  membersLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  avatarGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  memberAvatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '2px solid var(--bg-primary)',
    marginLeft: '-8px',
    objectFit: 'cover',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  boardColumn: {
    padding: '16px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--border-radius-lg)',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-color)',
  },
  columnIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  columnName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  columnCount: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  columnBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '300px',
  },
  listContainer: {
    padding: '20px',
  },
  emptyTasksList: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  listTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  listHeaderRow: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '2px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  listHeaderCell: {
    textAlign: 'left',
  },
  listRow: {
    display: 'flex',
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  listCell: {
    textAlign: 'left',
  },
  statusTag: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  priorityTag: {
    fontSize: '13px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  assigneeText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  taskCardAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  modalPrimaryButton: {
    padding: '10px 18px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalSecondaryButton: {
    padding: '10px 18px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 500,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalDangerButton: {
    padding: '10px 18px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--priority-urgent)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginRight: 'auto',
    transition: 'all 0.2s',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--priority-urgent)',
    padding: '12px',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: '13px',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'var(--priority-low)',
    padding: '12px',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: '13px',
    textAlign: 'center',
  },
  detailTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  commentsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  commentsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  commentsLoading: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '12px 0',
  },
  noComments: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '16px 0',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px dashed var(--border-color)',
  },
  commentCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '10px 12px',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    fontSize: '10px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAuthor: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  commentTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  commentText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
  },
  addCommentForm: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  commentInput: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  },
  commentSubmitButton: {
    padding: '0 16px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  attachmentsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  attachmentsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  attachmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  noAttachments: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '12px 0',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px dashed var(--border-color)',
  },
  attachmentCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '8px 12px',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachmentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    overflow: 'hidden',
  },
  attachmentName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  attachmentDownloadBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  uploadArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
  },
  uploadLabel: {
    padding: '8px 14px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  uploadProgress: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
