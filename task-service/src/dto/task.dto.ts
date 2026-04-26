import { IsString, IsEnum, IsOptional, IsArray, IsDate, IsNumber } from 'class-validator';
import { TaskStatus, TaskPriority, TaskDecisionStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  assignedTo!: string;

  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  proposalId?: string;

  @IsString()
  @IsOptional()
  rationale?: string;

  @IsEnum(TaskDecisionStatus)
  @IsOptional()
  decisionStatus?: TaskDecisionStatus;

  @IsString()
  @IsOptional()
  blockerNote?: string;

  @IsString()
  @IsOptional()
  employeeComment?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  proposalId?: string;

  @IsString()
  @IsOptional()
  rationale?: string;

  @IsEnum(TaskDecisionStatus)
  @IsOptional()
  decisionStatus?: TaskDecisionStatus;

  @IsString()
  @IsOptional()
  blockerNote?: string;

  @IsString()
  @IsOptional()
  employeeComment?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;
}

export class CreateTaskBatchDto {
  @IsArray()
  tasks!: CreateTaskDto[];

  @IsString()
  userId!: string;
}
