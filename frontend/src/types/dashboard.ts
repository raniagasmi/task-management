import type { Alert } from './analytics';
import type { Task } from './task';

export type DashboardEmployee = {
  id: string;
  name: string;
  email: string;
  presenceStatus?: 'ONLINE' | 'PAUSE' | 'OFFLINE';
};

export type DashboardProject = {
  id: string;
  name: string;
};

export type EmployeeDashboardResponse = {
  projects: DashboardProject[];
  employees: DashboardEmployee[];
  alerts: Alert[];
  tasks: Task[];
  lastUpdated: string;
};
