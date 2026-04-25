import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CopilotCreateThreadDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class CopilotThreadActionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  threadId!: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsBoolean()
  @IsOptional()
  isMuted?: boolean;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

