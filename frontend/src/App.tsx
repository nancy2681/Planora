import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { ProjectView } from './pages/ProjectView';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import api from './services/api';
import { Loader2 } from 'lucide-react';

// Protected Route Guard Layout
const ProtectedLayout: React.FC<{ 
  onNewProjectClick: () => void; 
  refreshTrigger: number;
}> = ({ onNewProjectClick, refreshTrigger }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} className="spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
        <span style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Validating Session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.layoutContainer}>
      <Sidebar onNewProjectClick={onNewProjectClick} refreshTrigger={refreshTrigger} />
      <main style={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

// Main App Router Setup
const AppRouter: React.FC = () => {
  const { user } = useAuth();
  
  // Manage new project modal state globally to be triggered from sidebar
  const [isNewProjOpen, setIsNewProjOpen] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;
    
    setCreating(true);
    try {
      await api.post('/projects', {
        name: newProjName,
        description: newProjDesc,
      });
      setIsNewProjOpen(false);
      setNewProjName('');
      setNewProjDesc('');
      setSidebarRefresh((prev) => prev + 1); // Refresh sidebar list
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Dashboard Workspace */}
        <Route 
          element={
            <ProtectedLayout 
              onNewProjectClick={() => setIsNewProjOpen(true)} 
              refreshTrigger={sidebarRefresh} 
            />
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<ProjectView />} />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      {/* Global Project Creator Modal */}
      <Modal isOpen={isNewProjOpen} onClose={() => setIsNewProjOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} style={styles.modalForm}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Project Name</label>
            <input
              type="text"
              placeholder="E.g. Mobile Application Development"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Summarize the project goals and objectives..."
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </div>

          <div style={styles.modalFooter}>
            <button 
              type="button" 
              onClick={() => setIsNewProjOpen(false)} 
              style={styles.modalSecondaryButton}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.modalPrimaryButton}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
  },
  layoutContainer: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: 'var(--bg-primary)',
  },
  mainContent: {
    marginLeft: 'var(--sidebar-width)',
    flex: 1,
    minHeight: '100vh',
    position: 'relative',
    boxSizing: 'border-box',
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

export default App;
