// Admin Analytics & Metrics Types

export type TimeTrackingStatus = 'ONLINE' | 'PAUSE' | 'OFFLINE';

export interface TimeTrackingSession {
  id: string;
  userId: string;
  status: TimeTrackingStatus;
  startedAt: Date;
  duration?: number; // in seconds
}

export interface EmployeeMetrics {
  userId: string;
  userName: string;
  email: string;

  // Completion metrics
  tasksCompleted: number;
  tasksPending: number;
  completionRate: number; // %

  // Performance
  onTimeRate: number; // %
  avgCompletionTime: number; // in hours
  performanceScore: number; // 0-100

  // Workload
  taskCount: number;
  weightedLoad: number; // HIGH=3, MEDIUM=2, LOW=1
  isOverloaded: boolean;
  isUnderutilized: boolean;

  // Time tracking
  dailyFocusTime: number; // in minutes (ONLINE status)
  pauseTime: number; // in minutes
  offlineTime: number; // in minutes
  lastActiveAt: Date;
  currentStatus: TimeTrackingStatus;

  // Deadline adherence
  deadlineAdherenceRate: number; // %
  tasksAtRisk: number;
  tasksOverdue: number;

  // Updated
  updatedAt: Date;
}

export type TaskRisk = 'SAFE' | 'AT_RISK' | 'OVERDUE';

export interface TaskDeadlineInfo {
  taskId: string;
  title: string;
  dueDate: Date;
  completedAt?: Date;
  risk: TaskRisk;
  daysUntilDue: number;
  progress: number; // 0-100
}

export interface TaskBehavior {
  taskId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  timeInStatus: number; // in hours
  createdAt: Date;
  updatedAt: Date;
  movedToDoneAt?: Date;
}

export interface ProjectMetrics {
  projectId: string;
  name: string;
  completionPercentage: number;
  tasksByStatus: {
    TODO: number;
    IN_PROGRESS: number;
    DONE: number;
  };
  bottlenecks: string[]; // task IDs stuck > 48 hours
  workloadDistribution: {
    employeeId: string;
    taskCount: number;
    load: number;
  }[];
  avgCompletionTime: number; // in hours
  onTimeCompletionRate: number; // %
  updatedAt: Date;
}

export type AlertType =
  | 'OVERLOADED_EMPLOYEE'
  | 'TASK_AT_RISK'
  | 'LOW_ACTIVITY'
  | 'PROJECT_DELAY'
  | 'TASK_OVERDUE'
  | 'BOTTLENECK_DETECTED';

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  targetId?: string; // userId or taskId or projectId
  targetType?: 'employee' | 'task' | 'project';
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
}

export interface AdminDashboardData {
  employees: EmployeeMetrics[];
  projects: ProjectMetrics[];
  alerts: Alert[];
  timeTrackingSessions: TimeTrackingSession[];
  taskBehaviors: TaskBehavior[];
  lastUpdated: Date;
}
