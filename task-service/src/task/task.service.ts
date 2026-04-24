import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { TaskReminder } from '../entities/task-reminder.entity';
import { CreateTaskBatchDto, CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskReminder)
    private reminderRepository: Repository<TaskReminder>,
  ) {}

  private convertMongoIdToUuid(mongoId: string): string {
    return uuidv4({ random: Buffer.from(mongoId.padEnd(32, '0').slice(0, 32), 'hex') });
  }

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    console.log('Creating task with userId:', userId); 
    const task = this.taskRepository.create({
      ...createTaskDto,
      assignedTo: createTaskDto.assignedTo ?? '',
      createdBy: userId,
      status: createTaskDto.status || TaskStatus.TODO,
      order: createTaskDto.order || 0,
    });
    console.log('Task to be created:', task); 
    return await this.taskRepository.save(task);
  }

  async createBatch(input: CreateTaskBatchDto): Promise<Task[]> {
    const createdTasks: Task[] = [];

    for (const taskInput of input.tasks) {
      const created = await this.create(taskInput, input.userId);
      createdTasks.push(created);
    }

    return createdTasks;
  }

  async findAll(): Promise<Task[]> {
    return await this.taskRepository.find({
      order: {
        order: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    return await this.taskRepository.save(task);
  }

  async remove(
    id: string,
    userId: string,
    role?: string,
  ): Promise<{ message: string }> {
    const task = await this.findOne(id);
    const normalizedRole = (role ?? '').toLowerCase();
    const canDelete =
      normalizedRole === 'admin' ||
      task.createdBy === userId ||
      task.assignedTo === userId;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    const result = await this.taskRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return { message: 'Task deleted successfully' };
  }

  async updateTaskOrder(id: string, newOrder: number): Promise<Task> {
    const result = await this.taskRepository.update(id, { order: newOrder });
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.findOne(id); // Fetch updated task if needed
  }

  async getTasksByAssignee(userId: string): Promise<Task[]> {
    return await this.taskRepository.find({
      where: { assignedTo: userId },
      order: {
        order: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async updateTaskStatus(id: string, status: string): Promise<Task> {
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const result = await this.taskRepository.update(id, { status: status as TaskStatus, updatedAt: new Date() });
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.findOne(id); // Fetch updated task if needed
  }

  async updateTaskActive(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.active = !task.active;
    task.updatedAt = new Date();
    return this.taskRepository.save(task);
  }

  async createReminder(taskId: string, userId: string, remindAt: string | Date) {
    const task = await this.findOne(taskId);

    const parsed = remindAt instanceof Date ? remindAt : new Date(remindAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid remindAt date');
    }

    const reminder = this.reminderRepository.create({
      taskId: task.id,
      userId,
      remindAt: parsed,
      sentAt: null,
      taskTitle: task.title,
      taskDueDate: task.dueDate ? new Date(task.dueDate) : null,
    });

    return this.reminderRepository.save(reminder);
  }

  async listRemindersForUser(userId: string) {
    return this.reminderRepository.find({
      where: { userId },
      order: { remindAt: 'ASC' },
    });
  }

  async findDueReminders(now: string | Date) {
    const parsed = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid now date');
    }

    return this.reminderRepository
      .createQueryBuilder('r')
      .where('r.sentAt IS NULL')
      .andWhere('r.remindAt <= :now', { now: parsed.toISOString() })
      .orderBy('r.remindAt', 'ASC')
      .limit(50)
      .getMany();
  }

  async markReminderSent(id: string, sentAt: string | Date) {
    const parsed = sentAt instanceof Date ? sentAt : new Date(sentAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid sentAt date');
    }

    const existing = await this.reminderRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Reminder with ID ${id} not found`);
    }

    existing.sentAt = parsed;
    return this.reminderRepository.save(existing);
  }
}
