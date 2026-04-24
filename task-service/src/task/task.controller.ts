import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TaskService } from './task.service';
import { CreateTaskBatchDto, CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @MessagePattern({ cmd: 'createTask' })
  create(@Payload() payload: { createTaskDto: CreateTaskDto; userId: string }) {
    console.log('Received payload:', payload); 
    return this.taskService.create(payload.createTaskDto, payload.userId);
  }

  @MessagePattern({ cmd: 'createTasksBatch' })
  createBatch(@Payload() payload: CreateTaskBatchDto) {
    return this.taskService.createBatch(payload);
  }

  @MessagePattern({ cmd: 'findAllTasks' })
  findAll() {
    return this.taskService.findAll();
  }

  @MessagePattern({ cmd: 'findOneTask' })
  findOne(@Payload() payload: string | { id: string }) {
    const id = typeof payload === 'string' ? payload : payload?.id;
    return this.taskService.findOne(id);
  }

  @MessagePattern({ cmd: 'updateTask' })
  update(@Payload() { id, updateTaskDto }: { id: string; updateTaskDto: UpdateTaskDto }) {
    return this.taskService.update(id, updateTaskDto);
  }

  @MessagePattern({ cmd: 'removeTask' })
  remove(@Payload() payload: { id: string; userId: string; role?: string }) {
    return this.taskService.remove(payload.id, payload.userId, payload.role);
  }

  @MessagePattern({ cmd: 'updateTaskOrder' })
  updateTaskOrder(@Payload() { id, newOrder }: { id: string; newOrder: number }) {
    return this.taskService.updateTaskOrder(id, newOrder);
  }


  
  @MessagePattern({ cmd: 'updateTaskActive' })
  updateActive(@Payload() { id }: { id: string }) {
    return this.taskService.updateTaskActive(id);
  }
  @MessagePattern({ cmd: 'updateTaskStatus' })
  updateStatus(@Payload() { id, status }: { id: string; status: string }) {
    return this.taskService.updateTaskStatus(id, status);
  }

  @MessagePattern({ cmd: 'getTasksByAssignee' })
  getTasksByAssignee(@Payload() payload: string | { userId: string }) {
    const userId = typeof payload === 'string' ? payload : payload?.userId;
    return this.taskService.getTasksByAssignee(userId);
  }

  @MessagePattern({ cmd: 'createTaskReminder' })
  createReminder(@Payload() payload: { taskId: string; userId: string; remindAt: string }) {
    return this.taskService.createReminder(payload.taskId, payload.userId, payload.remindAt);
  }

  @MessagePattern({ cmd: 'listTaskRemindersByUser' })
  listReminders(@Payload() payload: string | { userId: string }) {
    const userId = typeof payload === 'string' ? payload : payload?.userId;
    return this.taskService.listRemindersForUser(userId);
  }

  @MessagePattern({ cmd: 'findDueTaskReminders' })
  findDueReminders(@Payload() payload: { now: string }) {
    return this.taskService.findDueReminders(payload.now);
  }

  @MessagePattern({ cmd: 'markTaskReminderSent' })
  markSent(@Payload() payload: { id: string; sentAt: string }) {
    return this.taskService.markReminderSent(payload.id, payload.sentAt);
  }
}
