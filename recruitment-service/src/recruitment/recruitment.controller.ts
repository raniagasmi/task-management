import { Body, Controller, Get, Param, Patch, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatResponse, GeneratedJobOffer } from './recruitment.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CopilotAppendMessageDto } from './dto/copilot-message.dto';
import { CopilotResetDto } from './dto/copilot-reset.dto';
import { CopilotCreateThreadDto, CopilotThreadActionDto } from './dto/copilot-thread.dto';
import { GenerateJobOfferDto } from './dto/generate-job-offer.dto';
import { GenerateLinkedInPostDto } from './dto/generate-linkedin-post.dto';
import { RecruitmentService } from './recruitment.service';

@Controller('recruitment')
export class RecruitmentController {
	constructor(private readonly recruitmentService: RecruitmentService) {}

	@Get('health')
	health() {
		return { ok: true, service: 'recruitment' };
	}

	@Post('generate')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async generate(@Body() body: GenerateJobOfferDto): Promise<GeneratedJobOffer> {
		return this.recruitmentService.generateJobOffer(body.prompt);
	}

	@Post('chat')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async chat(@Body() body: ChatMessageDto): Promise<ChatResponse> {
		return this.recruitmentService.chat(body.sessionId, body.message);
	}

	@Post('linkedin-post')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async generateLinkedInPost(@Body() body: GenerateLinkedInPostDto): Promise<string> {
		return this.recruitmentService.generateLinkedInPostFromJobOfferId(body.jobOfferId);
	}

	@Get('copilot/history')
	async copilotHistory(@Query('userId') userId?: string) {
		return this.recruitmentService.getCopilotHistory((userId ?? '').trim());
	}

	@Get('copilot/threads')
	async copilotThreads(@Query('userId') userId?: string) {
		return this.recruitmentService.listCopilotThreads((userId ?? '').trim());
	}

	@Get('copilot/threads/:threadId')
	async copilotThread(@Param('threadId') threadId: string, @Query('userId') userId?: string) {
		return this.recruitmentService.getCopilotThread((userId ?? '').trim(), threadId);
	}

	@Post('copilot/threads')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async copilotCreateThread(@Body() body: CopilotCreateThreadDto) {
		return this.recruitmentService.createCopilotThread(body.userId);
	}

	@Post('copilot/message')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async copilotAppend(@Body() body: CopilotAppendMessageDto) {
		return this.recruitmentService.appendCopilotMessage(body.userId, body.threadId, body.role, body.content);
	}

	@Patch('copilot/threads/:threadId')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async copilotThreadAction(@Param('threadId') threadId: string, @Body() body: CopilotThreadActionDto) {
		return this.recruitmentService.updateCopilotThread(body.userId, threadId, body);
	}

	@Post('copilot/reset')
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async copilotReset(@Body() body: CopilotResetDto) {
		return this.recruitmentService.resetCopilotHistory(body.userId, body.threadId);
	}
}
