import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { Task } from '../entities/task.entity';
import { TaskReminder } from '../entities/task-reminder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskReminder])],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
