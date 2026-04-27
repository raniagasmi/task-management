import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CollaborationService } from '../collaboration/collaboration.service';

type TaskRecord = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo?: string;
  conversationId?: string | null;
  dueDate?: string | Date | null;
};

type Alert = {
  id: string;
  type: 'TASK_AT_RISK' | 'TASK_OVERDUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  targetId?: string;
  targetType?: 'task';
  createdAt: string;
  resolvedAt?: string;
  isResolved: boolean;
};

@Injectable()
export class DashboardService {
  constructor(
    @Inject('TASK_SERVICE') private readonly taskClient: ClientProxy,
    private readonly collaborationService: CollaborationService,
  ) {}

  async getMyDashboard(userId: string) {
    const normalizedUserId = (userId ?? '').trim();
    if (!normalizedUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const [conversations, tasks] = await Promise.all([
      this.collaborationService.getConversationsForUser(normalizedUserId),
      firstValueFrom(this.taskClient.send<TaskRecord[]>({ cmd: 'getTasksByAssignee' }, normalizedUserId)),
    ]);

    const projects = (Array.isArray(conversations) ? conversations : []).map((conversation: any) => {
      const id = conversation?.id ?? conversation?._id?.toString?.() ?? conversation?._id ?? '';
      const name = String(conversation?.title ?? '').trim() || 'Untitled Project';
      return {
        id: String(id),
        name,
      };
    });

    const employeesMap = new Map<string, { id: string; name: string; email: string }>();
    (Array.isArray(conversations) ? conversations : []).forEach((conversation: any) => {
      const members = [
        ...(conversation?.members ?? []),
        ...(conversation?.admin ? [conversation.admin] : []),
      ];

      members.forEach((member: any) => {
        const id = String(member?.id ?? member?._id ?? '').trim();
        if (!id) {
          return;
        }

        const firstName = String(member?.firstName ?? '').trim();
        const lastName = String(member?.lastName ?? '').trim();
        const fullName = String(member?.fullName ?? '').trim();
        const email = String(member?.email ?? '').trim();

        // Never fall back to raw IDs in the UI.
        const candidateName = `${firstName} ${lastName}`.trim() || fullName;
        const name = candidateName && candidateName !== id ? candidateName : 'Unknown Employee';

        employeesMap.set(id, { id, name, email });
      });
    });

    const alerts = this.buildTaskAlerts(tasks ?? []);

    return {
      projects,
      employees: Array.from(employeesMap.values()),
      alerts,
      tasks: tasks ?? [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private buildTaskAlerts(tasks: TaskRecord[]): Alert[] {
    const now = Date.now();
    const alerts: Alert[] = [];

    for (const task of tasks) {
      if (!task?.id || task.status === 'DONE' || !task.dueDate) {
        continue;
      }

      const dueTime = new Date(task.dueDate as any).getTime();
      if (Number.isNaN(dueTime)) {
        continue;
      }

      const msUntilDue = dueTime - now;
      if (msUntilDue < 0) {
        alerts.push({
          id: `task-overdue-${task.id}`,
          type: 'TASK_OVERDUE',
          severity: 'HIGH',
          message: `"${task.title}" is overdue.`,
          targetId: task.id,
          targetType: 'task',
          createdAt: new Date().toISOString(),
          isResolved: false,
        });
        continue;
      }

      const oneDayMs = 24 * 60 * 60 * 1000;
      if (msUntilDue <= oneDayMs) {
        alerts.push({
          id: `task-at-risk-${task.id}`,
          type: 'TASK_AT_RISK',
          severity: 'MEDIUM',
          message: `"${task.title}" is due within 24 hours.`,
          targetId: task.id,
          targetType: 'task',
          createdAt: new Date().toISOString(),
          isResolved: false,
        });
      }
    }

    return alerts;
  }
}

