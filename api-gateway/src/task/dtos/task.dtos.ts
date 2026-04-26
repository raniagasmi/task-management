import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsISO8601,
} from 'class-validator';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskDecisionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus = TaskStatus.TODO;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

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

  @IsNumber()
  @IsOptional()
  order?: number;

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

export class UpdateStatusDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: TaskStatus;
}

export class UpdateActiveDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  active!: boolean;
}

export class UpdateTaskOrderDto {
  @IsNumber()
  @IsNotEmpty()
  order!: number;
}

export class CreateTaskReminderDto {
  @IsISO8601()
  @IsNotEmpty()
  remindAt!: string;
}
