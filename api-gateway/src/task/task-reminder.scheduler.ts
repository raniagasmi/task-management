import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

type TaskReminderRecord = {
  id: string;
  taskId: string;
  userId: string;
  remindAt: string | Date;
  sentAt: string | Date | null;
  taskTitle: string;
  taskDueDate: string | Date | null;
};

@Injectable()
export class TaskReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @Inject('TASK_SERVICE') private readonly taskClient: ClientProxy,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  onModuleInit() {
    // Keep this lightweight: just poll for due reminders and fan out over sockets.
    this.timer = setInterval(() => {
      void this.tick();
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const due = await firstValueFrom(
        this.taskClient.send<TaskReminderRecord[]>(
          { cmd: 'findDueTaskReminders' },
          { now: new Date().toISOString() },
        ),
      );

      for (const reminder of due ?? []) {
        if (!reminder?.id || !reminder?.userId) {
          continue;
        }

        this.collaborationGateway.emitTaskReminder({
          userId: reminder.userId,
          reminderId: reminder.id,
          taskId: reminder.taskId,
          taskTitle: reminder.taskTitle,
          remindAt: new Date(reminder.remindAt).toISOString(),
          taskDueDate: reminder.taskDueDate ? new Date(reminder.taskDueDate).toISOString() : null,
        });

        await firstValueFrom(
          this.taskClient.send(
            { cmd: 'markTaskReminderSent' },
            { id: reminder.id, sentAt: new Date().toISOString() },
          ),
        );
      }
    } catch (error) {
      // Non-fatal: scheduler should never crash the gateway.
      console.error('TaskReminderScheduler tick failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

