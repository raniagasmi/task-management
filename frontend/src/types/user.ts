export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  DEVELOPER = 'developer',
  SALES_REP = 'sales rep',
  HR = 'hr',
  FINANCE = 'finance',
  MARKETER = 'marketer',
}

export type PresenceStatus = 'ONLINE' | 'PAUSE' | 'OFFLINE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  presenceStatus?: PresenceStatus;
  lastActiveAt?: string | null;
  presenceUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  tasks: string[];
  notifications: string[];
}
