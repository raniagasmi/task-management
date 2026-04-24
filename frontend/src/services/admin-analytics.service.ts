import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import {
  EmployeeMetrics,
  ProjectMetrics,
  Alert,
  TaskRisk,
  AdminDashboardData,
  TimeTrackingSession,
} from '../types/analytics';
import { Task, TaskPriority, TaskStatus } from '../types/task';
import { PresenceStatus, User } from '../types/user';

/**
 * Admin Analytics Service
 * Calculates and manages all metrics for the admin dashboard
 */
class AdminAnalyticsService {
  /**
   * Calculate employee metrics from tasks and time tracking data
   */
  calculateEmployeeMetrics(
    employee: User,
    allTasks: Task[],
    timeTrackingSessions: TimeTrackingSession[]
  ): EmployeeMetrics {
    const employeeTasks = allTasks.filter((t) => t.assignedTo === employee.id);
    const completedTasks = employeeTasks.filter((t) => t.status === TaskStatus.DONE);
    const pendingTasks = employeeTasks.filter((t) => t.status !== TaskStatus.DONE);

    // Completion metrics
    const tasksCompleted = completedTasks.length;
    const tasksPending = pendingTasks.length;
    const completionRate = employeeTasks.length > 0 ? (tasksCompleted / employeeTasks.length) * 100 : 0;

    // Workload calculation
    const taskCount = employeeTasks.length;
    const weightedLoad = employeeTasks.reduce((sum, task) => {
      const priorityValue = task.priority === TaskPriority.HIGH ? 3 : task.priority === TaskPriority.MEDIUM ? 2 : 1;
      return sum + priorityValue;
    }, 0);

    const avgLoad = taskCount > 0 ? weightedLoad / taskCount : 0;
    const isOverloaded = weightedLoad > 20; // threshold
    const isUnderutilized = weightedLoad < 3 && taskCount > 0;

    // On-time metrics
    const { onTimeRate, avgCompletionTime, tasksAtRisk, tasksOverdue } = this.calculateDeadlineMetrics(
      employeeTasks
    );

    // Time tracking
    const userSessions = timeTrackingSessions.filter((s) => s.userId === employee.id);
    const dailyFocusTime = this.calculateFocusTime(userSessions, 'ONLINE');
    const pauseTime = this.calculateFocusTime(userSessions, 'PAUSE');
    const offlineTime = this.calculateFocusTime(userSessions, 'OFFLINE');

    const currentSession = userSessions[userSessions.length - 1];
    const currentStatus = (employee.presenceStatus ||
      currentSession?.status ||
      'OFFLINE') as PresenceStatus;
    const lastActiveAt = employee.lastActiveAt
      ? new Date(employee.lastActiveAt)
      : currentSession?.startedAt || new Date();

    // Performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(
      completionRate,
      onTimeRate,
      dailyFocusTime,
      weightedLoad
    );

    return {
      userId: employee.id,
      userName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      tasksCompleted,
      tasksPending,
      completionRate: Math.round(completionRate),
      onTimeRate: Math.round(onTimeRate),
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      performanceScore: Math.round(performanceScore),
      taskCount,
      weightedLoad,
      isOverloaded,
      isUnderutilized,
      dailyFocusTime: Math.round(dailyFocusTime),
      pauseTime: Math.round(pauseTime),
      offlineTime: Math.round(offlineTime),
      lastActiveAt,
      currentStatus,
      deadlineAdherenceRate: Math.round(onTimeRate),
      tasksAtRisk,
      tasksOverdue,
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate deadline-related metrics
   */
  private calculateDeadlineMetrics(tasks: Task[]) {
    const now = Date.now();
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
    const pendingTasks = tasks.filter((t) => t.status !== TaskStatus.DONE);

    let onTimeCount = 0;
    let totalCompletionTime = 0;
    let tasksAtRisk = 0;
    let tasksOverdue = 0;

    completedTasks.forEach((task) => {
      if (task.dueDate && task.updatedAt) {
        const dueTime = new Date(task.dueDate).getTime();
        const completeTime = new Date(task.updatedAt).getTime();
        if (completeTime <= dueTime) {
          onTimeCount++;
        }
        totalCompletionTime += completeTime - new Date(task.createdAt || now).getTime();
      }
    });

    pendingTasks.forEach((task) => {
      if (task.dueDate) {
        const dueTime = new Date(task.dueDate).getTime();
        const daysUntilDue = (dueTime - now) / (1000 * 60 * 60 * 24);
        const progress = task.status === TaskStatus.IN_PROGRESS ? 50 : 0;

        if (daysUntilDue < 0) {
          tasksOverdue++;
        } else if (daysUntilDue < 2) {
          tasksAtRisk++;
        }
      }
    });

    const onTimeRate = completedTasks.length > 0 ? (onTimeCount / completedTasks.length) * 100 : 0;
    const avgCompletionTime =
      completedTasks.length > 0
        ? totalCompletionTime / completedTasks.length / (1000 * 60 * 60) // convert to hours
        : 0;

    return { onTimeRate, avgCompletionTime, tasksAtRisk, tasksOverdue };
  }

  /**
   * Calculate focus time from time tracking sessions
   */
  private calculateFocusTime(sessions: TimeTrackingSession[], status: 'ONLINE' | 'PAUSE' | 'OFFLINE'): number {
    const totalSeconds = sessions
      .filter((s) => s.status === status)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    return totalSeconds / 60; // convert to minutes
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculatePerformanceScore(
    completionRate: number,
    onTimeRate: number,
    focusTime: number,
    workload: number
  ): number {
    // Weighted scoring:
    // - Completion rate: 40%
    // - On-time rate: 30%
    // - Focus time: 20%
    // - Workload balance: 10%

    const completionScore = (completionRate / 100) * 40;
    const timelinessScore = (onTimeRate / 100) * 30;

    // Focus time: normalize to 0-100 (target 8 hours = 480 minutes)
    const focusScore = Math.min((focusTime / 480) * 100, 100) * 0.2;

    // Workload: optimal around 8-12 weighted load
    let workloadScore = 0;
    if (workload >= 5 && workload <= 20) {
      workloadScore = 10; // optimal
    } else if (workload < 5) {
      workloadScore = 5; // underutilized
    } else {
      workloadScore = Math.max(0, 10 - (workload - 20) / 5);
    }

    return completionScore + timelinessScore + focusScore + workloadScore;
  }

  /**
   * Calculate project metrics
   */
  calculateProjectMetrics(projectId: string, allTasks: Task[], employees: User[]): ProjectMetrics {
    const projectTasks = allTasks.filter((t) => t.conversationId === projectId || !t.conversationId);

    const tasksByStatus = {
      TODO: projectTasks.filter((t) => t.status === TaskStatus.TODO).length,
      IN_PROGRESS: projectTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      DONE: projectTasks.filter((t) => t.status === TaskStatus.DONE).length,
    };

    const totalTasks = projectTasks.length;
    const completionPercentage = totalTasks > 0 ? (tasksByStatus.DONE / totalTasks) * 100 : 0;

    // Find bottlenecks (tasks stuck > 48 hours in IN_PROGRESS)
    const now = Date.now();
    const bottlenecks: string[] = projectTasks
      .filter((t) => {
        if (t.status !== TaskStatus.IN_PROGRESS || !t.updatedAt) return false;
        const ageHours = (now - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
        return ageHours > 48;
      })
      .map((t) => t.id);

    // Workload distribution
    const workloadDistribution = employees.map((emp) => {
      const empTasks = projectTasks.filter((t) => t.assignedTo === emp.id);
      const load = empTasks.reduce((sum, t) => {
        const priorityValue = t.priority === TaskPriority.HIGH ? 3 : t.priority === TaskPriority.MEDIUM ? 2 : 1;
        return sum + priorityValue;
      }, 0);

      return {
        employeeId: emp.id,
        taskCount: empTasks.length,
        load,
      };
    });

    // Average completion time
    const completedTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE);
    let totalCompletionTime = 0;
    completedTasks.forEach((task) => {
      if (task.createdAt && task.updatedAt) {
        totalCompletionTime += new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
      }
    });
    const avgCompletionTime =
      completedTasks.length > 0 ? totalCompletionTime / completedTasks.length / (1000 * 60 * 60) : 0;

    // On-time completion rate
    const onTimeTasks = completedTasks.filter((t) => {
      if (!t.dueDate || !t.updatedAt) return false;
      return new Date(t.updatedAt).getTime() <= new Date(t.dueDate).getTime();
    });
    const onTimeCompletionRate =
      completedTasks.length > 0 ? (onTimeTasks.length / completedTasks.length) * 100 : 0;

    return {
      projectId,
      name: `Project ${projectId.slice(0, 8)}`,
      completionPercentage: Math.round(completionPercentage),
      tasksByStatus,
      bottlenecks,
      workloadDistribution,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      onTimeCompletionRate: Math.round(onTimeCompletionRate),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate alerts based on metrics
   */
  generateAlerts(
    employees: EmployeeMetrics[],
    allTasks: Task[],
    projects: ProjectMetrics[]
  ): Alert[] {
    const alerts: Alert[] = [];
    let alertId = 0;

    // Check for overloaded employees
    employees.forEach((emp) => {
      if (emp.isOverloaded) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'OVERLOADED_EMPLOYEE',
          severity: 'HIGH',
          message: `${emp.userName} is overloaded with ${emp.weightedLoad} weighted load units`,
          targetId: emp.userId,
          targetType: 'employee',
          createdAt: new Date(),
          isResolved: false,
        });
      }
    });

    // Check for tasks at risk
    allTasks.forEach((task) => {
      if (!task.dueDate) return;

      const daysUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 0 && task.status !== TaskStatus.DONE) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'TASK_OVERDUE',
          severity: 'HIGH',
          message: `Task "${task.title}" is overdue`,
          targetId: task.id,
          targetType: 'task',
          createdAt: new Date(),
          isResolved: false,
        });
      } else if (daysUntilDue < 2 && daysUntilDue >= 0 && task.status === TaskStatus.TODO) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'TASK_AT_RISK',
          severity: 'MEDIUM',
          message: `Task "${task.title}" is at risk (due in ${Math.ceil(daysUntilDue)} days)`,
          targetId: task.id,
          targetType: 'task',
          createdAt: new Date(),
          isResolved: false,
        });
      }
    });

    // Check for project delays
    projects.forEach((proj) => {
      if (proj.completionPercentage < 30 && proj.tasksByStatus.IN_PROGRESS > proj.tasksByStatus.DONE) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'PROJECT_DELAY',
          severity: 'MEDIUM',
          message: `${proj.name} may be delayed (only ${proj.completionPercentage}% complete)`,
          targetId: proj.projectId,
          targetType: 'project',
          createdAt: new Date(),
          isResolved: false,
        });
      }
    });

    // Check for bottlenecks
    projects.forEach((proj) => {
      if (proj.bottlenecks.length > 0) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'BOTTLENECK_DETECTED',
          severity: 'HIGH',
          message: `${proj.name} has ${proj.bottlenecks.length} bottleneck(s) (stuck tasks)`,
          targetId: proj.projectId,
          targetType: 'project',
          createdAt: new Date(),
          isResolved: false,
        });
      }
    });

    // Check for low activity
    employees.forEach((emp) => {
      if (emp.dailyFocusTime < 60 && emp.taskCount > 0) {
        // less than 1 hour of focus time
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'LOW_ACTIVITY',
          severity: 'LOW',
          message: `${emp.userName} has low focus time today (${emp.dailyFocusTime} min)`,
          targetId: emp.userId,
          targetType: 'employee',
          createdAt: new Date(),
          isResolved: false,
        });
      }
    });

    return alerts;
  }

  /**
   * Compile all dashboard data
   */
  compileDashboardData(
    employees: EmployeeMetrics[],
    projects: ProjectMetrics[],
    alerts: Alert[],
    timeTrackingSessions: TimeTrackingSession[],
    tasks: Task[]
  ): AdminDashboardData {
    const taskBehaviors = tasks.map((task) => {
      const createdAt = task.createdAt ? new Date(task.createdAt) : new Date();
      const updatedAt = task.updatedAt ? new Date(task.updatedAt) : createdAt;
      const timeInStatus =
        task.status === TaskStatus.DONE
          ? (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
          : (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

      return {
        taskId: task.id,
        title: task.title,
        status: task.status,
        timeInStatus: Math.round(timeInStatus * 10) / 10,
        createdAt,
        updatedAt,
        movedToDoneAt: task.status === TaskStatus.DONE ? updatedAt : undefined,
      };
    });

    return {
      employees,
      projects,
      alerts,
      timeTrackingSessions,
      taskBehaviors,
      lastUpdated: new Date(),
    };
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
