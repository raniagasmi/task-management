import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateTaskDto,
  CreateTaskReminderDto,
  UpdateTaskDto,
  UpdateStatusDto,
  UpdateTaskOrderDto,
} from './dtos/task.dtos';
import { Task } from './models/task.model';
import { UserService } from '../user/user.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    @Inject('TASK_SERVICE') private readonly taskClient: ClientProxy,
    private readonly userService: UserService,
  ) {}

  private async enrichTasksWithUsers(tasks: Task[]) {
    const ids = Array.from(
      new Set((tasks ?? []).map((t) => String((t as any)?.assignedTo ?? '')).filter(Boolean)),
    );

    const usersById = new Map<string, { firstName: string; lastName: string; email?: string }>();
    await Promise.all(
      ids.map(async (id) => {
        try {
          const user = await this.userService.findById(id);
          if (user) {
            usersById.set(id, {
              firstName: String((user as any).firstName ?? ''),
              lastName: String((user as any).lastName ?? ''),
              email: (user as any).email,
            });
          }
        } catch {
          // If a referenced user was deleted, we still return tasks, just without user enrichment.
        }
      }),
    );

    return (tasks ?? []).map((task) => {
      const assignedTo = String((task as any)?.assignedTo ?? '');
      const assignedUser = usersById.get(assignedTo);
      return {
        ...task,
        assignedToUser: assignedUser
          ? { firstName: assignedUser.firstName, lastName: assignedUser.lastName }
          : undefined,
      };
    });
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: { user: { userId?: string; email: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.taskClient
      .send({ cmd: 'createTask' }, { createTaskDto, userId })
      .toPromise();
    const [enriched] = await this.enrichTasksWithUsers([result as Task]);
    return enriched as any;
  }

  @Get()
  async findAll(
    @Request() req: { user: { userId?: string; role?: string } },
  ): Promise<Task[]> {
    const userId = req.user?.userId;
    const role = (req.user?.role ?? '').toLowerCase();

    if (role === 'admin') {
      const tasks = await this.taskClient
        .send({ cmd: 'findAllTasks' }, {})
        .toPromise();
      return (await this.enrichTasksWithUsers(tasks as Task[])) as any;
    }

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const tasks = await this.taskClient
      .send({ cmd: 'getTasksByAssignee' }, userId)
      .toPromise();
    return (await this.enrichTasksWithUsers(tasks as Task[])) as any;
  }

  @Get('reminders/me')
  async listMyReminders(@Request() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.taskClient
      .send({ cmd: 'listTaskRemindersByUser' }, userId)
      .toPromise();
  }

  @Post(':id/reminders')
  @UsePipes(new ValidationPipe())
  async createReminder(
    @Param('id') taskId: string,
    @Body() body: CreateTaskReminderDto,
    @Request() req: { user: { userId?: string; role?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const role = (req.user?.role ?? '').toLowerCase();
    if (role !== 'admin') {
      const task = await this.taskClient
        .send<Task>({ cmd: 'findOneTask' }, taskId)
        .toPromise();

      const assignedTo = String((task as any)?.assignedTo ?? '');
      const createdBy = String((task as any)?.createdBy ?? '');
      if (assignedTo !== userId && createdBy !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.taskClient
      .send(
        { cmd: 'createTaskReminder' },
        { taskId, userId, remindAt: body.remindAt },
      )
      .toPromise();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Task> {
    const task: Task | undefined = await this.taskClient
      .send<Task>({ cmd: 'findOneTask' }, id)
      .toPromise();
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    const [enriched] = await this.enrichTasksWithUsers([task]);
    return enriched as any;
  }

  @Put(':id')
  @UsePipes(new ValidationPipe())
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.taskClient
      .send<Task>({ cmd: 'updateTask' }, { id, updateTaskDto })
      .toPromise();

    if (!task) {
      throw new Error(`Task with id ${id} could not be updated`);
    }
    const [enriched] = await this.enrichTasksWithUsers([task]);
    return enriched as any;
  }

  @Put(':id/schedule')
  @UsePipes(new ValidationPipe())
  async updateSchedule(
    @Param('id') id: string,
    @Body() body: { dueDate?: string },
    @Request() req: { user: { userId?: string; role?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const role = (req.user?.role ?? '').toLowerCase();
    if (role !== 'admin') {
      const task = await this.taskClient
        .send<Task>({ cmd: 'findOneTask' }, id)
        .toPromise();

      const assignedTo = String((task as any)?.assignedTo ?? '');
      const createdBy = String((task as any)?.createdBy ?? '');
      if (assignedTo !== userId && createdBy !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const task = await this.taskClient
      .send<Task>({ cmd: 'updateTask' }, { id, updateTaskDto: { dueDate: body.dueDate } })
      .toPromise();

    if (!task) {
      throw new Error(`Task with id ${id} could not be updated`);
    }

    const [enriched] = await this.enrichTasksWithUsers([task]);
    return enriched as any;
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { userId?: string; role?: string } },
  ): Promise<{ message: string }> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const result = await this.taskClient
      .send<{ message: string } | undefined>(
        { cmd: 'removeTask' },
        { id, userId, role: req.user?.role ?? '' },
      )
      .toPromise();

    if (!result) {
      throw new Error(
        'Failed to remove the task. No response from the service.',
      );
    }

    return result;
  }

  @Put(':id/status')
  @UsePipes(new ValidationPipe())
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req: { user: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.taskClient
      .send(
        { cmd: 'updateTaskStatus' },
        { id, status: updateStatusDto.status, userId },
      )
      .toPromise();
    const [enriched] = await this.enrichTasksWithUsers([result as Task]);
    return enriched as any;
  }

  @Put(':id/active')
  @UsePipes(new ValidationPipe())
  async updateActive(
    @Param('id') id: string,
    @Request() req: { user: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.taskClient
      .send({ cmd: 'updateTaskActive' }, { id, userId })
      .toPromise();
    const [enriched] = await this.enrichTasksWithUsers([result as Task]);
    return enriched as any;
  }

  @Put(':id/order')
  @UsePipes(new ValidationPipe())
  async updateTaskOrder(
    @Param('id') id: string,
    @Body() updateTaskOrderDto: UpdateTaskOrderDto,
  ) {
    const updated = await this.taskClient
      .send({ cmd: 'updateTaskOrder' }, { id, newOrder: updateTaskOrderDto.order })
      .toPromise();
    const [enriched] = await this.enrichTasksWithUsers([updated as Task]);
    return enriched as any;
  }

  @Get('/assignee/:userId')
  async getTasksByAssignee(
    @Param('userId') userId: string,
    @Request() req: { user: { userId?: string; role?: string } },
  ) {
    const requesterRole = (req.user?.role ?? '').toLowerCase();
    const requesterId = req.user?.userId ?? '';
    if (requesterRole !== 'admin' && requesterId !== userId) {
      throw new UnauthorizedException('Access denied');
    }

    const tasks = await this.taskClient
      .send({ cmd: 'getTasksByAssignee' }, userId)
      .toPromise();
    return (await this.enrichTasksWithUsers(tasks as Task[])) as any;
  }
}
