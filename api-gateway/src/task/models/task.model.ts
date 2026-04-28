export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  conversationId?: string;
  projectId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
