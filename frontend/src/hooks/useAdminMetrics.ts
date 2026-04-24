import { useEffect, useState, useCallback } from 'react';
import { timeTrackingService } from '../services/time-tracking.service';
import { adminAnalyticsService } from '../services/admin-analytics.service';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import {
  EmployeeMetrics,
  AdminDashboardData,
  ProjectMetrics,
  Alert,
  TimeTrackingSession,
} from '../types/analytics';
import { Task } from '../types/task';
import { User } from '../types/user';

/**
 * Hook: Track time for current user (ONLINE/PAUSE/OFFLINE)
 */
export const useTimeTracking = (userId?: string) => {
  const [currentStatus, setCurrentStatus] = useState('OFFLINE');
  const [focusTime, setFocusTime] = useState(0); // in minutes
  const [pauseTime, setPauseTime] = useState(0);

  useEffect(() => {
    if (!userId) return;

    timeTrackingService.startTracking(userId);

    // Setup activity detection
    const handleActivity = () => {
      timeTrackingService.recordActivity(userId);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    // Status change listener
    timeTrackingService.onStatusChange(userId, (status) => {
      setCurrentStatus(status);
    });

    // Calculate focus time periodically
    const calculateInterval = setInterval(() => {
      const sessions = timeTrackingService.getAllSessions();
      const online = timeTrackingService.calculateTimeByStatus(
        userId,
        sessions,
        'ONLINE'
      );
      const pause = timeTrackingService.calculateTimeByStatus(
        userId,
        sessions,
        'PAUSE'
      );

      setFocusTime(Math.round(online));
      setPauseTime(Math.round(pause));
    }, 10000); // Update every 10 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearInterval(calculateInterval);
      // Optionally stop tracking on unmount
      // timeTrackingService.stopTracking(userId);
    };
  }, [userId]);

  const togglePause = useCallback(() => {
    if (!userId) return;
    const session = timeTrackingService.getSession(userId);
    const newStatus = session?.status === 'PAUSE' ? 'ONLINE' : 'PAUSE';
    timeTrackingService.updateStatus(userId, newStatus as 'ONLINE' | 'PAUSE');
  }, [userId]);

  return { currentStatus, focusTime, pauseTime, togglePause };
};

/**
 * Hook: Load employee metrics for admin dashboard
 */
export const useEmployeeMetrics = (shouldLoad: boolean = false) => {
  const [employees, setEmployees] = useState<EmployeeMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoading(true);
        const [allUsers, allTasks] = await Promise.all([
          userService.getAllUsers(),
          taskService.getAllTasks(),
        ]);

        const timeSessions = timeTrackingService.getAllSessions();

        const metrics = allUsers.map((user) =>
          adminAnalyticsService.calculateEmployeeMetrics(user, allTasks, timeSessions)
        );

        setEmployees(metrics);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load employee metrics';
        setError(message);
        console.error(message, err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [shouldLoad]);

  return { employees, loading, error, refetch: () => { } };
};

/**
 * Hook: Load project metrics for admin dashboard
 */
export const useProjectMetrics = (shouldLoad: boolean = false) => {
  const [projects, setProjects] = useState<ProjectMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoading(true);
        const [allUsers, allTasks] = await Promise.all([
          userService.getAllUsers(),
          taskService.getAllTasks(),
        ]);

        // Group tasks by conversation (project)
        const projectMap = new Map<string, Task[]>();
        allTasks.forEach((task) => {
          const projectId = task.conversationId || 'default-project';
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, []);
          }
          projectMap.get(projectId)!.push(task);
        });

        const metrics = Array.from(projectMap.entries()).map(([projectId, tasks]) =>
          adminAnalyticsService.calculateProjectMetrics(projectId, tasks, allUsers)
        );

        setProjects(metrics);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load project metrics';
        setError(message);
        console.error(message, err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [shouldLoad]);

  return { projects, loading, error };
};

/**
 * Hook: Load alerts for admin dashboard
 */
export const useAdminAlerts = (
  shouldLoad: boolean = false,
  employeeMetrics: EmployeeMetrics[] = [],
  projectMetrics: ProjectMetrics[] = []
) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad || employeeMetrics.length === 0 || projectMetrics.length === 0) {
      setLoading(false);
      return;
    }

    const loadAlerts = async () => {
      try {
        setLoading(true);
        const allTasks = await taskService.getAllTasks();

        const generated = adminAnalyticsService.generateAlerts(
          employeeMetrics,
          allTasks,
          projectMetrics
        );

        setAlerts(generated);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load alerts';
        setError(message);
        console.error(message, err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();

    // Refresh every 60 seconds
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [shouldLoad, employeeMetrics, projectMetrics]);

  return { alerts, loading, error };
};

/**
 * Hook: Load complete admin dashboard data
 */
export const useAdminDashboard = (isAdmin: boolean = false) => {
  const { employees, loading: empLoading, error: empError } = useEmployeeMetrics(isAdmin);
  const { projects, loading: projLoading, error: projError } = useProjectMetrics(isAdmin);
  const { alerts, loading: alertLoading, error: alertError } = useAdminAlerts(
    isAdmin,
    employees,
    projects
  );

  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    const loadTasks = async () => {
      try {
        setTasksLoading(true);
        const allTasks = await taskService.getAllTasks();
        setTasks(allTasks);
        setTasksError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        setTasksError(message);
        console.error(message, err);
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || empLoading || projLoading || alertLoading || tasksLoading) return;

    const timeSessions = timeTrackingService.getAllSessions();
    const compiled = adminAnalyticsService.compileDashboardData(
      employees,
      projects,
      alerts,
      timeSessions,
      tasks
    );

    setDashboardData(compiled);
  }, [isAdmin, employees, projects, alerts, tasks, empLoading, projLoading, alertLoading, tasksLoading]);

  const isLoading = empLoading || projLoading || alertLoading || tasksLoading;
  const error = empError || projError || alertError || tasksError;

  return {
    dashboardData,
    isLoading,
    error,
  };
};
