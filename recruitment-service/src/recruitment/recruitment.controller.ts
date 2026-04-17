import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatResponse, GeneratedJobOffer } from './recruitment.service';
import { ChatMessageDto } from './dto/chat-message.dto';
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
}