import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { DecomposeProjectDto } from './dto/decompose-project.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('decompose-project')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  decomposeProject(@Body() body: DecomposeProjectDto) {
    return this.aiService.decomposeProject(body);
  }
}
