import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { File as MulterFile } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecruitmentService } from './recruitment.service';

@Controller('api/recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get('health')
  async health() {
    return this.recruitmentService.health();
  }

  @Get('jobs')
  async publicJobs() {
    return this.recruitmentService.listPublicJobs();
  }

  @Post('jobs/:jobOfferId/apply')
  @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async apply(
    @Param('jobOfferId') jobOfferId: string,
    @Body() body: { name: string; email: string },
    @UploadedFile() cv: MulterFile,
  ) {
    return this.recruitmentService.applyForJob(jobOfferId, body, cv);
  }

  @Get('applications/track/:token')
  async trackApplication(@Param('token') token: string) {
    return this.recruitmentService.trackApplication(token);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Body() body: { prompt: string }) {
    return this.recruitmentService.generate(body);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: { sessionId: string; message: string }) {
    return this.recruitmentService.chat(body);
  }

  @Post('linkedin-post')
  @UseGuards(JwtAuthGuard)
  async linkedinPost(@Body() body: { jobOfferId: string }) {
    return this.recruitmentService.generateLinkedInPost(body);
  }

  @Get('copilot/history')
  @UseGuards(JwtAuthGuard)
  async copilotHistory(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.recruitmentService.getCopilotHistory(userId);
  }

  @Get('copilot/threads')
  @UseGuards(JwtAuthGuard)
  async copilotThreads(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.listCopilotThreads(userId);
  }

  @Get('copilot/threads/:threadId')
  @UseGuards(JwtAuthGuard)
  async copilotThread(@Req() req: { user: { userId?: string } }, @Param('threadId') threadId: string) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.getCopilotThread(userId, threadId);
  }

  @Post('copilot/threads')
  @UseGuards(JwtAuthGuard)
  async createCopilotThread(@Req() req: { user: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recruitmentService.createCopilotThread(userId);
  }

  @Post('copilot/message')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  @Get('admin/jobs')
  @UseGuards(JwtAuthGuard)
  async adminJobs() {
    return this.recruitmentService.listAdminJobs();
  }

  @Delete('admin/jobs/:jobOfferId')
  @UseGuards(JwtAuthGuard)
  async closeJob(@Param('jobOfferId') jobOfferId: string) {
    return this.recruitmentService.closeJob(jobOfferId);
  }

  @Get('admin/jobs/:jobOfferId/applications')
  @UseGuards(JwtAuthGuard)
  async adminApplications(@Param('jobOfferId') jobOfferId: string, @Query('status') status?: string) {
    return this.recruitmentService.listApplicationsByJob(jobOfferId, status);
  }

  @Get('admin/jobs/:jobOfferId/pipeline')
  @UseGuards(JwtAuthGuard)
  async adminPipeline(@Param('jobOfferId') jobOfferId: string) {
    return this.recruitmentService.getApplicationPipeline(jobOfferId);
  }

  @Get('admin/applications/:applicationId')
  @UseGuards(JwtAuthGuard)
  async adminApplication(@Param('applicationId') applicationId: string) {
    return this.recruitmentService.getApplication(applicationId);
  }

  @Patch('admin/applications/:applicationId/status')
  @UseGuards(JwtAuthGuard)
  async adminApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body() body: { status: string },
  ) {
    return this.recruitmentService.updateApplicationStatus(applicationId, body.status);
  }
}
