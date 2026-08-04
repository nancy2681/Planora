import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { getAvatarUrl } from '../services/api';
import type { Project, Notification } from '../types';
import { Modal } from './Modal';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Plus, 
  LogOut, 
  ChevronRight,
  Bell,
  CheckCheck,
  Calendar,
  Mail,
  Camera,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  onNewProjectClick: () => void;
  refreshTrigger: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewProjectClick, refreshTrigger }) => {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);


  const handleOpenProfile = () => {
    if (!user) return;
    setEditName(user.name);
    setAvatarFile(null);
    setAvatarPreview(getAvatarUrl(user.avatarUrl));
    setIsProfileOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;

    setIsSavingProfile(true);
    const formData = new FormData();
    formData.append('name', editName.trim());
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const response = await api.put('/auth/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      updateUser(response.data);
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Failed to save profile changes:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-read');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching sidebar projects:', error);
      }
    };
    if (user) {
      fetchProjects();
    }
  }, [user, refreshTrigger]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <div style={styles.logoIcon}>P</div>
        <span style={styles.logoText}>Planora</span>
      </div>

      <div style={styles.navGroup}>
        <span style={styles.navHeader}>Navigation</span>
        <NavLink 
          to="/dashboard" 
          style={({ isActive }) => ({
            ...styles.navLink,
            ...(isActive ? styles.navLinkActive : {})
          })}
        >
          <LayoutDashboard size={18} style={styles.linkIcon} />
          <span>Dashboard</span>
        </NavLink>
      </div>

      <div style={styles.navGroupProjects}>
        <div style={styles.projectHeaderContainer}>
          <span style={styles.navHeader}>My Projects</span>
          <button onClick={onNewProjectClick} style={styles.addProjectButton} className="add-proj-btn" title="Create Project">
            <Plus size={16} />
          </button>
        </div>

        <div style={styles.projectsList}>
          {projects.length === 0 ? (
            <div style={styles.emptyState}>No projects yet</div>
          ) : (
            projects.map((project) => {
              const isActive = projectId === project._id;
              return (
                <NavLink
                  key={project._id}
                  to={`/project/${project._id}`}
                  className="project-link"
                  style={{
                    ...styles.projectLink,
                    ...(isActive ? styles.projectLinkActive : {})
                  }}
                >
                  <FolderGit2 size={16} style={{
                    ...styles.linkIcon,
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                  }} />
                  <span style={styles.projectName}>{project.name}</span>
                  {isActive && <ChevronRight size={14} style={styles.activeIndicator} />}
                </NavLink>
              );
            })
          )}
        </div>
      </div>

      {/* Notifications trigger with floating popover */}
      <div style={styles.notificationHeader}>
        <button onClick={() => setShowNotifs(!showNotifs)} style={styles.notifTriggerButton} className="sidebar-link">
          <Bell size={18} />
          {unreadCount > 0 && <span style={styles.notifBadge}>{unreadCount}</span>}
          <span>Alerts ({unreadCount})</span>
        </button>
        
        {showNotifs && (
          <div style={styles.notifDropdown} className="glass-panel fade-in">
            <div style={styles.notifDropHeader}>
              <span>System Alerts</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={styles.markAllReadButton}>
                  <CheckCheck size={14} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
            <div style={styles.notifList}>
              {notifications.length === 0 ? (
                <div style={styles.emptyNotifs}>No notifications yet</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif._id} style={{
                    ...styles.notifItem,
                    opacity: notif.isRead ? 0.6 : 1
                  }}>
                    <div style={styles.notifSenderRow}>
                      <img src={getAvatarUrl(notif.sender?.avatarUrl)} alt="avatar" style={styles.notifSenderAvatar} />
                      <span style={{ fontWeight: 600, fontSize: '11px' }}>{notif.sender?.name}</span>
                    </div>
                    <span style={styles.notifTitle}>{notif.title}</span>
                    <p style={styles.notifMsg}>{notif.message}</p>
                    <span style={styles.notifTime}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div style={styles.userProfile}>
        <div onClick={handleOpenProfile} style={styles.userProfileClickable} className="sidebar-profile-btn" title="View Profile">
          <img 
            src={getAvatarUrl(user?.avatarUrl)} 
            alt="Avatar" 
            style={styles.avatar} 
          />
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name}</span>
            <span style={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
        <button onClick={toggleTheme} style={styles.themeToggle} className="theme-toggle-btn" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button onClick={handleLogout} style={styles.logoutButton} className="logout-btn" title="Logout">
          <LogOut size={16} />
        </button>
      </div>

      {/* Profile Settings Modal */}
      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="My Profile Settings">
        <form onSubmit={handleSaveProfile} style={styles.modalForm}>
          
          {/* Avatar Section */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarContainer}>
              <img src={avatarPreview} alt="Avatar Preview" style={styles.avatarLarge} />
              <label style={styles.avatarUploadBadge} title="Change Profile Picture">
                <Camera size={14} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            <span style={styles.avatarHelp}>Click camera to upload avatar</span>
          </div>

          {/* Read-Only Details */}
          <div style={styles.profileMetaGroup}>
            <div style={styles.metaItem}>
              <Mail size={16} style={styles.metaIcon} />
              <div>
                <span style={styles.metaLabel}>Email Address</span>
                <span style={styles.metaValue}>{user?.email}</span>
              </div>
            </div>

            <div style={styles.metaItem}>
              <Calendar size={16} style={styles.metaIcon} />
              <div>
                <span style={styles.metaLabel}>Joined On</span>
                <span style={styles.metaValue}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Fields */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input 
              type="text" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={styles.input}
              required
              disabled={isSavingProfile}
            />
          </div>

          <div style={styles.modalFooter}>
            <button 
              type="button" 
              onClick={() => setIsProfileOpen(false)} 
              style={styles.modalSecondaryButton}
              disabled={isSavingProfile}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.modalPrimaryButton}
              disabled={isSavingProfile || !editName.trim()}
            >
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    boxSizing: 'border-box',
    zIndex: 100,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    paddingLeft: '8px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '24px',
  },
  navGroupProjects: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflowY: 'auto',
    marginBottom: '16px',
  },
  navHeader: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    paddingLeft: '8px',
  },
  projectHeaderContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  addProjectButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    transition: 'all 0.2s',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    fontWeight: 600,
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  projectLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  projectLinkActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  projectName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  activeIndicator: {
    color: 'var(--primary)',
  },
  linkIcon: {
    flexShrink: 0,
  },
  emptyState: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    paddingLeft: '12px',
    fontStyle: 'italic',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
    marginTop: 'auto',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--border-color)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 'var(--border-radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  themeToggle: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 'var(--border-radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  notificationHeader: {
    marginBottom: '16px',
    padding: '0 8px',
    position: 'relative',
  },
  notifTriggerButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--border-radius-sm)',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
    position: 'relative',
  },
  notifBadge: {
    backgroundColor: 'var(--priority-urgent)',
    color: '#fff',
    fontSize: '9px',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '1px 5px',
    position: 'absolute',
    left: '20px',
    top: '3px',
  },
  notifDropdown: {
    position: 'fixed',
    left: '270px',
    bottom: '80px',
    width: '300px',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    zIndex: 999,
  },
  notifDropHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: '13px',
    backgroundColor: 'var(--bg-tertiary)',
  },
  markAllReadButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  notifList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyNotifs: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  notifItem: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'all 0.2s',
  },
  notifSenderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  },
  notifSenderAvatar: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  notifTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  notifMsg: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  notifTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  userProfileClickable: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--border-radius-sm)',
    transition: 'all 0.2s',
    minWidth: 0,
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  avatarContainer: {
    position: 'relative',
    width: '80px',
    height: '80px',
  },
  avatarLarge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
  },
  avatarUploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'var(--primary)',
    color: '#fff',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s',
  },
  avatarHelp: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  profileMetaGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'var(--bg-primary)',
    padding: '16px',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    marginBottom: '20px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  metaIcon: {
    color: 'var(--primary)',
  },
  metaLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metaValue: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
};
