import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { DashboardStats } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend 
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Loader2, 
  ArrowUpRight 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/tasks/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} className="spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
        <span style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading Workspace Insights...</span>
      </div>
    );
  }

  // Pre-formatted data for Recharts status pie chart
  const statusData = stats ? [
    { name: 'To Do', value: stats.statusCounts.todo, color: 'var(--status-todo)' },
    { name: 'In Progress', value: stats.statusCounts.in_progress, color: 'var(--status-in-progress)' },
    { name: 'In Review', value: stats.statusCounts.in_review, color: 'var(--status-in-review)' },
    { name: 'Done', value: stats.statusCounts.done, color: 'var(--status-done)' },
  ].filter(item => item.value > 0) : [];

  // Pre-formatted data for Recharts priority bar chart
  const priorityData = stats ? [
    { name: 'Low', count: stats.priorityCounts.low, color: 'var(--priority-low)' },
    { name: 'Medium', count: stats.priorityCounts.medium, color: 'var(--priority-medium)' },
    { name: 'High', count: stats.priorityCounts.high, color: 'var(--priority-high)' },
    { name: 'Urgent', count: stats.priorityCounts.urgent, color: 'var(--priority-urgent)' },
  ] : [];

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workspace Dashboard</h1>
          <p style={styles.subtitle}>Overview of your projects, team velocity, and task distributions</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiIconWrapper}>
            <Briefcase size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={styles.kpiInfo}>
            <span style={styles.kpiValue}>{stats?.totalProjects || 0}</span>
            <span style={styles.kpiLabel}>Total Projects</span>
          </div>
        </div>

        <div style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiIconWrapper}>
            <Clock size={22} style={{ color: 'var(--status-in-progress)' }} />
          </div>
          <div style={styles.kpiInfo}>
            <span style={styles.kpiValue}>{stats?.totalTasks || 0}</span>
            <span style={styles.kpiLabel}>Total Tasks</span>
          </div>
        </div>

        <div style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiIconWrapper}>
            <CheckCircle2 size={22} style={{ color: 'var(--status-done)' }} />
          </div>
          <div style={styles.kpiInfo}>
            <span style={styles.kpiValue}>{stats?.statusCounts.done || 0}</span>
            <span style={styles.kpiLabel}>Completed Tasks</span>
          </div>
        </div>

        <div style={styles.kpiCard} className="glass-panel">
          <div style={styles.kpiIconWrapper}>
            <AlertTriangle size={22} style={{ color: 'var(--priority-urgent)' }} />
          </div>
          <div style={styles.kpiInfo}>
            <span style={styles.kpiValue}>{stats?.priorityCounts.urgent || 0}</span>
            <span style={styles.kpiLabel}>Urgent Tasks</span>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div style={styles.chartGrid}>
        <div style={styles.chartCard} className="glass-panel">
          <h3 style={styles.chartTitle}>Task Distribution by Status</h3>
          <div style={styles.chartWrapper}>
            {statusData.length === 0 ? (
              <div style={styles.noDataState}>No tasks found in workspace.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 12px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                    itemStyle={{ color: 'var(--text-secondary)', fontSize: '13px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={styles.chartCard} className="glass-panel">
          <h3 style={styles.chartTitle}>Task Volume by Priority</h3>
          <div style={styles.chartWrapper}>
            {stats && stats.totalTasks === 0 ? (
              <div style={styles.noDataState}>No task priorities to display.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px 12px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                    itemStyle={{ color: 'var(--text-secondary)', fontSize: '13px' }}
                    cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.15 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section (Upcoming deadlines) */}
      <div style={styles.bottomSection}>
        <div style={styles.deadlinesCard} className="glass-panel">
          <div style={styles.deadlinesHeader}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={styles.chartTitle}>Upcoming Deadlines</h3>
          </div>

          <div style={styles.deadlinesList}>
            {!stats || stats.upcomingTasks.length === 0 ? (
              <div style={styles.emptyDeadlines}>No upcoming tasks scheduled with due dates.</div>
            ) : (
              stats.upcomingTasks.map((task) => (
                <div key={task._id} style={styles.deadlineItem} className="deadline-item">
                  <div style={styles.deadlineMeta}>
                    <span style={{
                      ...styles.statusDot,
                      backgroundColor: `var(--status-${task.status.replace('_', '-')})`
                    }} />
                    <div style={styles.deadlineDetails}>
                      <span style={styles.deadlineTitle}>{task.title}</span>
                      <span style={styles.deadlineProject}>{task.projectId.name}</span>
                    </div>
                  </div>

                  <div style={styles.deadlineDates}>
                    <span style={styles.deadlineDateVal}>
                      {new Date(task.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => navigate(`/project/${task.projectId._id}`)} 
                      style={styles.viewTaskButton}
                      className="view-task-btn"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
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
    alignItems: 'center',
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
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  kpiCard: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  kpiIconWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-color)',
  },
  kpiInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  kpiLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  chartCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  chartWrapper: {
    width: '100%',
    height: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataState: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  bottomSection: {
    width: '100%',
  },
  deadlinesCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  deadlinesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  deadlinesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  deadlineItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: 'var(--border-radius-sm)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s',
  },
  deadlineMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  deadlineDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  deadlineTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deadlineProject: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  deadlineDates: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginLeft: '12px',
  },
  deadlineDateVal: {
    fontSize: '13px',
    color: 'var(--priority-high)',
    fontWeight: 500,
  },
  viewTaskButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  emptyDeadlines: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontStyle: 'italic',
  },
};
