export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  assignedToUser?: {
    firstName: string;
    lastName: string;
    email?: string;
    presenceStatus?: string;
  };
  rationale?: string;
  decisionStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  blockerNote?: string;
  employeeComment?: string;
  estimatedHours?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
