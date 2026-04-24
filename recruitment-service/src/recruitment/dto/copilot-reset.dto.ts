import { IsNotEmpty, IsString } from 'class-validator';

export class CopilotResetDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

