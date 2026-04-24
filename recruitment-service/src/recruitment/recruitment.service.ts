import {
	BadGatewayException,
	BadRequestException,
	HttpException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { buildJobOfferPrompt } from '../common/prompt/build-job-offer.prompt';
import {
	JobOffer as ParsedJobOffer,
	parseJobOfferResponse,
} from '../common/parser/parse-job-offer.parser';
import { AiService } from './ai.service';
import { CopilotThread, CopilotThreadDocument } from './schemas/copilot-thread.schema';
import { JobOffer, JobOfferDocument } from './schemas/job-offer.schema';

export interface GeneratedJobOffer extends ParsedJobOffer {
	jobOfferId: string;
}

export enum ChatStep {
	TITLE = 'title',
	SKILLS = 'skills',
	EXPERIENCE_LEVEL = 'experienceLevel',
	ADDITIONAL_CONTEXT = 'additionalContext',
	COMPLETE = 'complete',
}

export interface ChatCollectedData {
	title?: string;
	skills?: string[];
	experienceLevel?: 'intern' | 'junior' | 'mid' | 'senior';
	additionalContext?: string;
}

export interface ChatState {
	sessionId: string;
	collectedData: ChatCollectedData;
	currentStep: ChatStep;
}

export type ChatResponse =
	| {
			sessionId: string;
			currentStep: ChatStep;
			nextQuestion: string;
			isComplete: false;
			collectedData: ChatCollectedData;
	  }
	| {
			sessionId: string;
			currentStep: ChatStep.COMPLETE;
			isComplete: true;
			jobOffer: GeneratedJobOffer;
			collectedData: ChatCollectedData;
	  };

@Injectable()
export class RecruitmentService {
	private readonly logger = new Logger(RecruitmentService.name);
	private readonly chatStates = new Map<string, ChatState>();

	constructor(
		private readonly aiService: AiService,
		@InjectModel(JobOffer.name)
		private readonly jobOfferModel: Model<JobOfferDocument>,
		@InjectModel(CopilotThread.name)
		private readonly copilotThreadModel: Model<CopilotThreadDocument>,
	) {}

	async getCopilotHistory(userId: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}

		const thread = await this.copilotThreadModel.findOne({ userId: normalized }).lean();
		const messages = (thread?.messages ?? []).map((message: any) => ({
			id: message?._id?.toString?.() ?? '',
			role: message.role,
			content: message.content,
			createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
		}));

		return { userId: normalized, messages };
	}

	async appendCopilotMessage(userId: string, role: 'user' | 'assistant', content: string) {
		const normalizedUserId = userId.trim();
		const normalizedContent = content.trim();
		if (!normalizedUserId) {
			throw new BadRequestException('userId must not be empty.');
		}
		if (!normalizedContent) {
			throw new BadRequestException('content must not be empty.');
		}

		const updated = await this.copilotThreadModel.findOneAndUpdate(
			{ userId: normalizedUserId },
			{
				$push: {
					messages: {
						role,
						content: normalizedContent,
						createdAt: new Date(),
					},
				},
			},
			{ upsert: true, new: true },
		);

		const last = updated?.messages?.[updated.messages.length - 1] as any;
		return {
			ok: true,
			message: last
				? {
						id: last?._id?.toString?.() ?? '',
						role: last.role,
						content: last.content,
						createdAt: last.createdAt ? new Date(last.createdAt).toISOString() : null,
				  }
				: null,
		};
	}

	async resetCopilotHistory(userId: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}

		await this.copilotThreadModel.deleteOne({ userId: normalized });
		return { ok: true };
	}

	async generateJobOffer(userPrompt: string): Promise<GeneratedJobOffer> {
		const prompt = buildJobOfferPrompt(userPrompt);
		return this.generateAndStoreFromPrompt(prompt);
	}

	startChat(sessionId: string): ChatState {
		const state: ChatState = {
			sessionId,
			collectedData: {},
			currentStep: ChatStep.TITLE,
		};

		this.chatStates.set(sessionId, state);
		return state;
	}

	updateChat(sessionId: string, userMessage: string): ChatState {
		const normalizedSessionId = sessionId.trim();
		const message = userMessage.trim();

		const state = this.chatStates.get(normalizedSessionId) ?? this.startChat(normalizedSessionId);

		switch (state.currentStep) {
			case ChatStep.TITLE:
				if (message) {
					state.collectedData.title = message;
				}
				break;
			case ChatStep.SKILLS:
				if (message) {
					state.collectedData.skills = this.parseSkills(message);
				}
				break;
			case ChatStep.EXPERIENCE_LEVEL:
				if (message) {
					state.collectedData.experienceLevel = this.normalizeExperienceLevel(message);
				}
				break;
			case ChatStep.ADDITIONAL_CONTEXT:
				if (message && !this.isSkipValue(message)) {
					state.collectedData.additionalContext = message;
				}
				break;
			case ChatStep.COMPLETE:
				break;
		}

		state.currentStep = this.getNextStep(state.collectedData);
		this.chatStates.set(normalizedSessionId, state);

		return state;
	}

	buildFinalPrompt(sessionId: string): string {
		const state = this.chatStates.get(sessionId);
		if (!state) {
			throw new UnprocessableEntityException('Chat session not found. Start a new chat session.');
		}

		if (state.currentStep !== ChatStep.COMPLETE) {
			throw new UnprocessableEntityException('Chat session is not complete yet.');
		}

		const data = state.collectedData;
		const combinedInput = [
			`Job title: ${data.title ?? ''}`,
			`Required skills: ${(data.skills ?? []).join(', ')}`,
			`Experience level: ${data.experienceLevel ?? ''}`,
			`Additional context: ${data.additionalContext ?? 'None'}`,
		].join('\n');

		return buildJobOfferPrompt(combinedInput);
	}

	async chat(sessionId: string, userMessage: string): Promise<ChatResponse> {
		const normalizedSessionId = sessionId.trim();
		if (!normalizedSessionId) {
			throw new UnprocessableEntityException('sessionId must not be empty.');
		}

		const state = this.updateChat(normalizedSessionId, userMessage);

		if (state.currentStep !== ChatStep.COMPLETE) {
			return {
				sessionId: normalizedSessionId,
				currentStep: state.currentStep,
				nextQuestion: this.getQuestionForStep(state.currentStep),
				isComplete: false,
				collectedData: state.collectedData,
			};
		}

		const finalPrompt = this.buildFinalPrompt(normalizedSessionId);
		const jobOffer = await this.generateAndStoreFromPrompt(finalPrompt);

		this.chatStates.delete(normalizedSessionId);

		return {
			sessionId: normalizedSessionId,
			currentStep: ChatStep.COMPLETE,
			isComplete: true,
			jobOffer,
			collectedData: state.collectedData,
		};
	}

	async generateLinkedInPostFromJobOfferId(jobOfferId: string): Promise<string> {
		if (!isValidObjectId(jobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		const jobOffer = await this.jobOfferModel.findById(jobOfferId).lean();
		if (!jobOffer) {
			throw new NotFoundException('JobOffer not found.');
		}

		return this.generateLinkedInPost({
			title: jobOffer.title,
			description: jobOffer.description,
			responsibilities: jobOffer.responsibilities,
			requiredSkills: jobOffer.requiredSkills,
			niceToHave: jobOffer.niceToHave,
			seniorityLevel: this.normalizeStoredLevel(jobOffer.seniorityLevel),
		});
	}

	generateLinkedInPost(jobOffer: ParsedJobOffer): string {
		const titleLine = `🚀 We're Hiring: ${jobOffer.title} (${jobOffer.seniorityLevel.toUpperCase()})`;
		const introLine =
			'We are looking for a motivated professional to join our team and help deliver high-impact products.';

		const responsibilitiesSection = [
			'Responsibilities:',
			...jobOffer.responsibilities.map((item) => `• ${item}`),
		].join('\n');

		const requiredSkillsSection = [
			'Required Skills:',
			...jobOffer.requiredSkills.map((item) => `• ${item}`),
		].join('\n');

		const niceToHaveSection =
			jobOffer.niceToHave.length > 0
				? ['Nice to Have:', ...jobOffer.niceToHave.map((item) => `• ${item}`)].join('\n')
				: '';

		const callToAction =
			'Interested? Apply now or contact our HR team to learn more about this opportunity.';

		return [
			titleLine,
			'',
			introLine,
			'',
			jobOffer.description,
			'',
			responsibilitiesSection,
			'',
			requiredSkillsSection,
			niceToHaveSection ? `\n${niceToHaveSection}` : '',
			'',
			callToAction,
		]
			.filter((line) => line !== '')
			.join('\n');
	}

	private async generateAndStoreFromPrompt(prompt: string): Promise<GeneratedJobOffer> {

		let aiResponse: string;
		try {
			aiResponse = await this.aiService.generateText(prompt);
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			const reason = error instanceof Error ? error.message : 'Unknown AI error';
			throw new BadGatewayException(`AI generation failed: ${reason}`);
		}

		let parsedJobOffer: ParsedJobOffer;
		try {
			parsedJobOffer = parseJobOfferResponse(aiResponse);
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'Unknown parser error';
			throw new UnprocessableEntityException(`Invalid AI response format: ${reason}`);
		}

		try {
			const saved = await this.jobOfferModel.create(parsedJobOffer);
			return {
				jobOfferId: saved._id.toString(),
				title: saved.title,
				description: saved.description,
				responsibilities: saved.responsibilities,
				requiredSkills: saved.requiredSkills,
				niceToHave: saved.niceToHave,
				seniorityLevel: parsedJobOffer.seniorityLevel,
			};
		} catch (error) {
			this.logger.error('Failed to save generated job offer to MongoDB', error);
			throw new InternalServerErrorException('Failed to save generated job offer.');
		}
	}

	private getNextStep(collectedData: ChatCollectedData): ChatStep {
		if (!collectedData.title) {
			return ChatStep.TITLE;
		}

		if (!collectedData.skills || collectedData.skills.length === 0) {
			return ChatStep.SKILLS;
		}

		if (!collectedData.experienceLevel) {
			return ChatStep.EXPERIENCE_LEVEL;
		}

		if (collectedData.additionalContext === undefined) {
			return ChatStep.ADDITIONAL_CONTEXT;
		}

		return ChatStep.COMPLETE;
	}

	private getQuestionForStep(step: ChatStep): string {
		switch (step) {
			case ChatStep.TITLE:
				return 'What is the job title?';
			case ChatStep.SKILLS:
				return 'What skills are required?';
			case ChatStep.EXPERIENCE_LEVEL:
				return 'What experience level is needed? (intern, junior, mid, senior)';
			case ChatStep.ADDITIONAL_CONTEXT:
				return 'Any additional context for this role? (reply "skip" if none)';
			case ChatStep.COMPLETE:
				return 'All required details are collected.';
		}
	}

	private parseSkills(message: string): string[] {
		return message
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}

	private normalizeExperienceLevel(message: string): 'intern' | 'junior' | 'mid' | 'senior' {
		const normalized = message.toLowerCase().trim();

		if (normalized.includes('intern')) {
			return 'intern';
		}

		if (normalized.includes('junior') || normalized.includes('entry')) {
			return 'junior';
		}

		if (normalized.includes('mid') || normalized.includes('intermediate')) {
			return 'mid';
		}

		if (normalized.includes('senior') || normalized.includes('lead') || normalized.includes('principal')) {
			return 'senior';
		}

		throw new UnprocessableEntityException(
			'Invalid experience level. Use one of: intern, junior, mid, senior.',
		);
	}

	private isSkipValue(message: string): boolean {
		const normalized = message.trim().toLowerCase();
		return normalized === 'skip' || normalized === 'none' || normalized === 'n/a';
	}

	private normalizeStoredLevel(level: string): 'intern' | 'junior' | 'mid' | 'senior' {
		const normalized = level.toLowerCase().trim();
		if (normalized === 'intern' || normalized === 'junior' || normalized === 'mid' || normalized === 'senior') {
			return normalized;
		}

		return this.normalizeExperienceLevel(level);
	}
}
