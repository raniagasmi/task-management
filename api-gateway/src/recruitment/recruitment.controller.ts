import { Body, Controller, Get, Post } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';

@Controller('api/recruitment')
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
}
