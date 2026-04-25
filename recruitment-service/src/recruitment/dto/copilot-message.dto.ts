import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CopilotAppendMessageDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  threadId!: string;

  @IsString()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content!: string;
}
