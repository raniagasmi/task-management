import { Body, Controller, Get, Param, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
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

  @Get('copilot/threads')
  async copilotThreads(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.listCopilotThreads(userId);
  }

  @Get('copilot/threads/:threadId')
  async copilotThread(@Req() req: { user: { userId?: string } }, @Param('threadId') threadId: string) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.getCopilotThread(userId, threadId);
  }

  @Post('copilot/threads')
  async createCopilotThread(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.createCopilotThread(userId);
  }

  @Post('copilot/message')
  async copilotMessage(
    @Body() body: { threadId: string; role: 'user' | 'assistant'; content: string },
    @Req() req: { user: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.appendCopilotMessage({
      userId,
      threadId: body.threadId,
      role: body.role,
      content: body.content,
    });
  }

  @Post('copilot/threads/:threadId/archive')
  async archiveCopilotThread(
    @Req() req: { user: { userId?: string } },
    @Param('threadId') threadId: string,
    @Body() body: { isArchived: boolean },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.updateCopilotThread({
      userId,
      threadId,
      isArchived: body.isArchived,
    });
  }

  @Post('copilot/threads/:threadId/mute')
  async muteCopilotThread(
    @Req() req: { user: { userId?: string } },
    @Param('threadId') threadId: string,
    @Body() body: { isMuted: boolean },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.updateCopilotThread({
      userId,
      threadId,
      isMuted: body.isMuted,
    });
  }

  @Post('copilot/threads/:threadId/delete')
  async deleteCopilotThread(@Req() req: { user: { userId?: string } }, @Param('threadId') threadId: string) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.updateCopilotThread({
      userId,
      threadId,
      isDeleted: true,
    });
  }

  @Post('copilot/reset')
  async copilotReset(
    @Req() req: { user: { userId?: string } },
    @Body() body: { threadId?: string },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.resetCopilotHistory(userId, body.threadId);
  }
}
