export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum TaskDecisionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  assignedToUser?: {
    firstName: string;
    lastName: string;
    email?: string;
    presenceStatus?: 'ONLINE' | 'PAUSE' | 'OFFLINE';
  };
  createdBy: string;
  order: number;
  conversationId?: string;
  rationale?: string;
  decisionStatus?: TaskDecisionStatus;
  blockerNote?: string;
  employeeComment?: string;
  estimatedHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date;
  active?: boolean;
}

export interface TaskWithUser extends Task {
  assignedToUser?: {
    firstName: string;
    lastName: string;
  };
  creatorDetails?: {
    id: string;
    name: string;
  };
}
