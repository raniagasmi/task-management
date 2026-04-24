import { useCallback, useEffect, useRef, useState } from 'react';
import { timeTrackingService } from '../services/time-tracking.service';
import { adminAnalyticsService } from '../services/admin-analytics.service';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { collaborationSocket } from '../services/collaboration.socket';
import { collaborationService } from '../services/collaboration.service';
import {
  EmployeeMetrics,
  AdminDashboardData,
  ProjectMetrics,
  Alert,
} from '../types/analytics';
import { Task } from '../types/task';
import { PresenceStatus } from '../types/user';

export const useTimeTracking = (userId?: string) => {
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('OFFLINE');
  const lastPresencePingRef = useRef(0);
  const statusRef = useRef<PresenceStatus>('OFFLINE');

  useEffect(() => {
    statusRef.current = currentStatus;
  }, [currentStatus]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    const syncPresence = async (status?: PresenceStatus) => {
      const updatedUser = await userService.updateMyPresence({
        status,
        lastActiveAt: new Date().toISOString(),
      });

      if (isMounted) {
        setCurrentStatus((updatedUser.presenceStatus as PresenceStatus) || 'OFFLINE');
      }
    };

    const initializePresence = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        const initialStatus: PresenceStatus =
          currentUser.presenceStatus === 'PAUSE' ? 'PAUSE' : 'ONLINE';
        await syncPresence(initialStatus);
      } catch (error) {
        console.error('Failed to initialize presence:', error);
      }
    };

    const handleActivity = () => {
      if (statusRef.current === 'PAUSE') {
        return;
      }

      const now = Date.now();
      if (now - lastPresencePingRef.current < 15000) {
        return;
      }

      lastPresencePingRef.current = now;
      void syncPresence('ONLINE');
    };

    const cleanupPresenceListener = collaborationSocket.onPresenceUpdated((payload) => {
      if (payload.userId === userId) {
        setCurrentStatus(payload.status);
      }
    });

    void initializePresence();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('focus', handleActivity);

    return () => {
      isMounted = false;
      cleanupPresenceListener();
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [userId]);

  const togglePause = useCallback(() => {
    if (!userId) {
      return;
    }

    const nextStatus: PresenceStatus = currentStatus === 'PAUSE' ? 'ONLINE' : 'PAUSE';

    void userService
      .updateMyPresence({
        status: nextStatus,
        lastActiveAt: new Date().toISOString(),
      })
      .then((updatedUser) => {
        setCurrentStatus((updatedUser.presenceStatus as PresenceStatus) || nextStatus);
      })
      .catch((error) => {
        console.error('Failed to toggle presence:', error);
      });
  }, [currentStatus, userId]);

  return { currentStatus, focusTime: 0, pauseTime: 0, togglePause };
};

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

        const metrics = allUsers.map((user) =>
          adminAnalyticsService.calculateEmployeeMetrics(user, allTasks, [])
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

    void loadMetrics();

    const cleanupPresenceListener = collaborationSocket.onPresenceUpdated((payload) => {
      setEmployees((currentEmployees) =>
        currentEmployees.map((employee) =>
          employee.userId === payload.userId
            ? {
                ...employee,
                currentStatus: payload.status,
                lastActiveAt: payload.lastActiveAt ? new Date(payload.lastActiveAt) : employee.lastActiveAt,
                updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
              }
            : employee
        )
      );
    });

    const interval = setInterval(() => {
      void loadMetrics();
    }, 30000);

    return () => {
      cleanupPresenceListener();
      clearInterval(interval);
    };
  }, [shouldLoad]);

  return { employees, loading, error, refetch: () => {} };
};

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

        const conversations = await collaborationService.getAllConversations().catch(() => []);
        const projectNamesById = new Map(
          conversations
            .map((conversation) => {
              const conversationId = conversation.id ?? conversation._id ?? '';
              return [conversationId, conversation.title] as const;
            })
            .filter(([conversationId]) => Boolean(conversationId))
        );

        const projectMap = new Map<string, Task[]>();
        allTasks.forEach((task) => {
          const projectId = task.conversationId || 'default-project';
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, []);
          }
          projectMap.get(projectId)!.push(task);
        });

        const metrics = Array.from(projectMap.entries()).map(([projectId, tasks]) =>
          adminAnalyticsService.calculateProjectMetrics(
            projectId,
            tasks,
            allUsers,
            projectNamesById.get(projectId)
          )
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

    void loadMetrics();

    const interval = setInterval(() => {
      void loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [shouldLoad]);

  return { projects, loading, error };
};

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

    void loadAlerts();

    const interval = setInterval(() => {
      void loadAlerts();
    }, 60000);

    return () => clearInterval(interval);
  }, [shouldLoad, employeeMetrics, projectMetrics]);

  return { alerts, loading, error };
};

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

    void loadTasks();
    const interval = setInterval(() => {
      void loadTasks();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || empLoading || projLoading || alertLoading || tasksLoading) {
      return;
    }

    const compiled = adminAnalyticsService.compileDashboardData(
      employees,
      projects,
      alerts,
      timeTrackingService.getAllSessions(),
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
