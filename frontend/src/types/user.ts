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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  tasks: string[];
  notifications: string[];
}
