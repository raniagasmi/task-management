import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CopilotResetDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  threadId?: string;
}
