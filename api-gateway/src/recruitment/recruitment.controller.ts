import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecruitmentService } from './recruitment.service';

@Controller('api/recruitment')
@UseGuards(JwtAuthGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get('health')
  async health() {
    return this.recruitmentService.health();
  }

  @Post('generate')
  async generate(@Body() body: { prompt: string }) {
    return this.recruitmentService.generate(body);
  }

  @Post('chat')
  async chat(@Body() body: { sessionId: string; message: string }) {
    return this.recruitmentService.chat(body);
  }

  @Post('linkedin-post')
  async linkedinPost(@Body() body: { jobOfferId: string }) {
    return this.recruitmentService.generateLinkedInPost(body);
  }

  @Get('copilot/history')
  async copilotHistory(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.getCopilotHistory(userId);
  }

  @Post('copilot/message')
  async copilotMessage(
    @Body() body: { role: 'user' | 'assistant'; content: string },
    @Req() req: { user: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.appendCopilotMessage({
      userId,
      role: body.role,
      content: body.content,
    });
  }

  @Post('copilot/reset')
  async copilotReset(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.resetCopilotHistory(userId);
  }
}
