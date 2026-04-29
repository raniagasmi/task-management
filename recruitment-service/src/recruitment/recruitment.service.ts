import {
	BadGatewayException,
	BadRequestException,
	HttpException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	OnModuleInit,
	UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { isValidObjectId, Model, Types } from 'mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { createConnection, Socket } from 'net';
import { connect as tlsConnect, TLSSocket } from 'tls';
import { extname, join } from 'path';
import type { File as MulterFile } from 'multer';
import { buildJobOfferPrompt } from '../common/prompt/build-job-offer.prompt';
import {
	JobOffer as ParsedJobOffer,
	parseJobOfferResponse,
} from '../common/parser/parse-job-offer.parser';
import { AiService } from './ai.service';
import { Application, ApplicationDocument, ApplicationStatus } from './schemas/application.schema';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
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

const APPLICATION_CONFIRMATION_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0f3d3a 0%, #1f6f6a 50%, #319795 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <div style="background: linear-gradient(135deg, #319795 0%, #2c7a7b 100%); padding: 50px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">Flexity</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Application Confirmation</p>
      </div>
      <div style="padding: 50px 40px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="color: #1f4f4f; margin-bottom: 16px;">Your application was received</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi {{CANDIDATE_NAME}}, thanks for applying for <strong>{{JOB_TITLE}}</strong>. You can track your application status from the button below.
          </p>
        </div>
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{APPLICATION_LINK}}" style="background: #319795; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; display: inline-block; font-size: 16px;">
            Track Application
          </a>
        </div>
        <div style="background: #f0fafa; border-radius: 16px; padding: 24px; border-left: 4px solid #319795;">
          <h3 style="margin-top: 0; color: #1f4f4f;">What happens next</h3>
          <p style="margin: 8px 0; color: #555;">1. Your CV is reviewed with the job requirements</p>
          <p style="margin: 8px 0; color: #555;">2. The hiring team follows your pipeline status</p>
          <p style="margin: 0; color: #555;">3. You can revisit your tracking link anytime</p>
        </div>
        <div style="text-align: center; margin-top: 40px;">
          <p style="color: #666; font-size: 14px;">
            If you did not submit this application, you can safely ignore this email.
          </p>
          <p style="color: #1f4f4f; font-weight: 600;">
            - The Flexity Team
          </p>
        </div>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: rgba(255,255,255,0.7); font-size: 12px;">
        This is an automated message. Please do not reply.
      </p>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px;">
        Copyright 2026 Flexity. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

@Injectable()
export class RecruitmentService implements OnModuleInit {
	private readonly logger = new Logger(RecruitmentService.name);
	private readonly chatStates = new Map<string, ChatState>();

	constructor(
		private readonly aiService: AiService,
		@InjectModel(JobOffer.name)
		private readonly jobOfferModel: Model<JobOfferDocument>,
		@InjectModel(CopilotThread.name)
		private readonly copilotThreadModel: Model<CopilotThreadDocument>,
		@InjectModel(Candidate.name)
		private readonly candidateModel: Model<CandidateDocument>,
		@InjectModel(Application.name)
		private readonly applicationModel: Model<ApplicationDocument>,
	) {}

	async onModuleInit() {
		await this.ensureCopilotThreadIndexes();
	}

	async applyForJob(
		jobOfferId: string,
		input: { name: string; email: string },
		cv: MulterFile | undefined,
	) {
		const normalizedJobOfferId = jobOfferId.trim();
		const name = input.name.trim();
		const email = input.email.trim().toLowerCase();

		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		if (!name) {
			throw new BadRequestException('name must not be empty.');
		}

		if (!email) {
			throw new BadRequestException('email must not be empty.');
		}

		if (!cv) {
			throw new BadRequestException('cv file is required.');
		}

		const jobOffer = await this.jobOfferModel.findById(normalizedJobOfferId).lean();
		if (!jobOffer) {
			throw new NotFoundException('JobOffer not found.');
		}

		const candidate = await this.candidateModel.create({
			name,
			email,
		});

		try {
			const ats = await this.buildAtsAnalysis(jobOffer, cv);
			const trackingToken = this.generateApplicationTrackingToken();
			const application = await this.applicationModel.create({
				candidateId: candidate._id,
				jobOfferId: jobOffer._id,
				status: ApplicationStatus.Applied,
				trackingToken,
				cv: this.mapCvUpload(cv),
				ats,
			});
			const applicationLink = this.buildApplicationLink(trackingToken);
			await this.sendApplicationConfirmationEmail({
				to: email,
				candidateName: name,
				jobTitle: jobOffer.title,
				applicationLink,
			});

			return {
				applicationId: application._id.toString(),
				status: application.status,
				token: trackingToken,
				applicationLink,
			};
		} catch (error) {
			await this.rollbackApplicationArtifacts(candidate._id.toString(), cv.path);
			throw error;
		}
	}

	async listPublicJobOffers() {
		const jobs = await this.jobOfferModel
			.find({ approvalStatus: 'approved' })
			.sort({ createdAt: -1 })
			.lean();

		return jobs.map((jobOffer) => ({
			jobOfferId: jobOffer._id.toString(),
			title: jobOffer.title,
			department: this.inferDepartment(jobOffer.title, jobOffer.description),
			date: jobOffer.createdAt ? new Date(jobOffer.createdAt).toISOString() : null,
			postedAt: jobOffer.createdAt ? new Date(jobOffer.createdAt).toISOString() : null,
			status: 'Open',
			description: jobOffer.description,
			responsibilities: jobOffer.responsibilities ?? [],
			requiredSkills: jobOffer.requiredSkills ?? [],
			niceToHave: jobOffer.niceToHave ?? [],
			seniorityLevel: jobOffer.seniorityLevel,
		}));
	}

	async listAllJobOffersForAdmin() {
		const jobs = await this.jobOfferModel
			.find()
			.sort({ createdAt: -1 })
			.lean();

		return jobs.map((jobOffer) => ({
			jobOfferId: jobOffer._id.toString(),
			title: jobOffer.title,
			department: this.inferDepartment(jobOffer.title, jobOffer.description),
			date: jobOffer.createdAt ? new Date(jobOffer.createdAt).toISOString() : null,
			postedAt: jobOffer.createdAt ? new Date(jobOffer.createdAt).toISOString() : null,
			status: 'Open',
			approvalStatus: jobOffer.approvalStatus ?? 'pending',
			description: jobOffer.description,
			responsibilities: jobOffer.responsibilities ?? [],
			requiredSkills: jobOffer.requiredSkills ?? [],
			niceToHave: jobOffer.niceToHave ?? [],
			seniorityLevel: jobOffer.seniorityLevel,
		}));
	}

	async approveJobOffer(jobOfferId: string) {
		const normalizedJobOfferId = jobOfferId.trim();
		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		const updated = await this.jobOfferModel.findByIdAndUpdate(
			normalizedJobOfferId,
			{ approvalStatus: 'approved' },
			{ new: true }
		).lean();

		if (!updated) {
			throw new NotFoundException('JobOffer not found.');
		}

		return {
			ok: true,
			jobOfferId: normalizedJobOfferId,
			approvalStatus: updated.approvalStatus,
		};
	}

	async rejectJobOffer(jobOfferId: string) {
		const normalizedJobOfferId = jobOfferId.trim();
		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		const updated = await this.jobOfferModel.findByIdAndUpdate(
			normalizedJobOfferId,
			{ approvalStatus: 'rejected' },
			{ new: true }
		).lean();

		if (!updated) {
			throw new NotFoundException('JobOffer not found.');
		}

		return {
			ok: true,
			jobOfferId: normalizedJobOfferId,
			approvalStatus: updated.approvalStatus,
		};
	}

	async closeJobOffer(jobOfferId: string) {
		const normalizedJobOfferId = jobOfferId.trim();
		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		const deleted = await this.jobOfferModel.findByIdAndDelete(normalizedJobOfferId).lean();
		if (!deleted) {
			throw new NotFoundException('JobOffer not found.');
		}

		return { ok: true, jobOfferId: normalizedJobOfferId };
	}

	async getApplicationByToken(token: string) {
		const normalizedToken = token.trim();
		if (!normalizedToken) {
			throw new BadRequestException('Application token is required.');
		}

		const application = await this.applicationModel
			.findOne({ trackingToken: normalizedToken })
			.populate('candidateId')
			.populate('jobOfferId');

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		return this.serializeApplication(application);
	}

	async updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
		const normalizedApplicationId = applicationId.trim();
		if (!isValidObjectId(normalizedApplicationId)) {
			throw new BadRequestException('Invalid applicationId format.');
		}

		const updated = await this.applicationModel
			.findByIdAndUpdate(
				normalizedApplicationId,
				{ $set: { status } },
				{ new: true },
			)
			.populate('candidateId')
			.populate('jobOfferId');

		if (!updated) {
			throw new NotFoundException('Application not found.');
		}

		return this.serializeApplication(updated);
	}

	async getApplicationById(applicationId: string) {
		const normalizedApplicationId = applicationId.trim();
		if (!isValidObjectId(normalizedApplicationId)) {
			throw new BadRequestException('Invalid applicationId format.');
		}

		const application = await this.applicationModel
			.findById(normalizedApplicationId)
			.populate('candidateId')
			.populate('jobOfferId');

		if (!application) {
			throw new NotFoundException('Application not found.');
		}

		return this.serializeApplication(application);
	}

	async listApplicationsByJobOfferId(jobOfferId: string, status?: ApplicationStatus) {
		const normalizedJobOfferId = jobOfferId.trim();
		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}

		const filter: Record<string, unknown> = { jobOfferId: new Types.ObjectId(normalizedJobOfferId) };
		if (status) {
			filter.status = status;
		}

		const applications = await this.applicationModel
			.find(filter)
			.sort({ createdAt: -1 })
			.populate('candidateId')
			.populate('jobOfferId');

		return {
			jobOfferId: normalizedJobOfferId,
			total: applications.length,
			applications: applications.map((application) => this.serializeApplication(application)),
		};
	}

	async getApplicationPipelineByJobOfferId(jobOfferId: string) {
		const normalizedJobOfferId = jobOfferId.trim();
		if (!isValidObjectId(normalizedJobOfferId)) {
			throw new BadRequestException('Invalid jobOfferId format.');
		}
		const objectJobOfferId = new Types.ObjectId(normalizedJobOfferId);

		const applications = await this.applicationModel
			.find({ jobOfferId: objectJobOfferId })
			.sort({ createdAt: -1 })
			.populate('candidateId')
			.populate('jobOfferId');

		const pipeline: Record<ApplicationStatus, any[]> = {
			[ApplicationStatus.Applied]: [],
			[ApplicationStatus.Interview]: [],
			[ApplicationStatus.Accepted]: [],
			[ApplicationStatus.Rejected]: [],
		};

		for (const application of applications) {
			const serialized = this.serializeApplication(application);
			pipeline[serialized.status].push(serialized);
		}

		return {
			jobOfferId: normalizedJobOfferId,
			total: applications.length,
			counts: {
				Applied: pipeline[ApplicationStatus.Applied].length,
				Interview: pipeline[ApplicationStatus.Interview].length,
				Accepted: pipeline[ApplicationStatus.Accepted].length,
				Rejected: pipeline[ApplicationStatus.Rejected].length,
			},
			pipeline,
		};
	}

	async getCopilotHistory(userId: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}
		const latestThread = await this.copilotThreadModel
			.findOne({ userId: normalized, isDeleted: { $ne: true } })
			.sort({ updatedAt: -1 })
			.lean();
		if (!latestThread) {
			return { userId: normalized, messages: [] };
		}
		return this.getCopilotThread(normalized, latestThread.threadId);
	}

	async listCopilotThreads(userId: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}

		const threads = await this.copilotThreadModel
			.find({ userId: normalized, isDeleted: { $ne: true } })
			.sort({ updatedAt: -1 });

		await Promise.all(threads.map((thread) => this.ensureCopilotThreadIntegrity(thread)));

		return {
			userId: normalized,
			threads: threads.map((thread) => {
				const updatedAt = (thread as CopilotThreadDocument & { updatedAt?: Date }).updatedAt;
				const lastMessage = Array.isArray(thread.messages)
					? thread.messages[thread.messages.length - 1]
					: undefined;

				return {
					threadId: thread.threadId,
					title: thread.title || 'New recruitment chat',
					firstPrompt: thread.firstPrompt || '',
					isArchived: !!thread.isArchived,
					isMuted: !!thread.isMuted,
					updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
					lastMessagePreview: String(lastMessage?.content ?? '').slice(0, 120),
				};
			}),
		};
	}

	async createCopilotThread(userId: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}

		const threadId = randomUUID();
		try {
			await this.copilotThreadModel.create({
				userId: normalized,
				threadId,
				title: 'New recruitment chat',
				firstPrompt: '',
				isArchived: false,
				isMuted: false,
				isDeleted: false,
				messages: [],
			});
		} catch (error) {
			if (this.isDuplicateUserIndexError(error)) {
				this.logger.warn('Detected stale unique userId index on copilot_threads. Repairing indexes and retrying.');
				await this.ensureCopilotThreadIndexes(true);
				await this.copilotThreadModel.create({
					userId: normalized,
					threadId,
					title: 'New recruitment chat',
					firstPrompt: '',
					isArchived: false,
					isMuted: false,
					isDeleted: false,
					messages: [],
				});
			} else {
				throw error;
			}
		}

		return this.getCopilotThread(normalized, threadId);
	}

	async getCopilotThread(userId: string, threadId: string) {
		const normalizedUserId = userId.trim();
		const normalizedThreadId = threadId.trim();
		if (!normalizedUserId || !normalizedThreadId) {
			throw new BadRequestException('userId and threadId are required.');
		}

		const thread = await this.copilotThreadModel
			.findOne({
				userId: normalizedUserId,
				threadId: normalizedThreadId,
				isDeleted: { $ne: true },
			});
		if (!thread) {
			throw new NotFoundException('Copilot thread not found.');
		}
		await this.ensureCopilotThreadIntegrity(thread);

		return {
			userId: normalizedUserId,
			threadId: normalizedThreadId,
			title: thread.title || 'New recruitment chat',
			firstPrompt: thread.firstPrompt || '',
			isArchived: !!thread.isArchived,
			isMuted: !!thread.isMuted,
			messages: (thread.messages ?? []).map((message: any) => ({
				id: message?._id?.toString?.() ?? '',
				role: message.role,
				content: message.content,
				createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
			})),
		};
	}

	async appendCopilotMessage(userId: string, threadId: string, role: 'user' | 'assistant', content: string) {
		const normalizedUserId = userId.trim();
		const normalizedThreadId = threadId.trim();
		const normalizedContent = content.trim();
		if (!normalizedUserId) {
			throw new BadRequestException('userId must not be empty.');
		}
		if (!normalizedThreadId) {
			throw new BadRequestException('threadId must not be empty.');
		}
		if (!normalizedContent) {
			throw new BadRequestException('content must not be empty.');
		}

		const existing = await this.copilotThreadModel.findOne({
			userId: normalizedUserId,
			threadId: normalizedThreadId,
			isDeleted: { $ne: true },
		});
		if (!existing) {
			throw new NotFoundException('Copilot thread not found.');
		}
		await this.ensureCopilotThreadIntegrity(existing);

		const shouldCaptureFirstPrompt = role === 'user' && !existing.firstPrompt;
		const computedTitle = shouldCaptureFirstPrompt ? this.buildCopilotTitle(normalizedContent) : existing.title;

		const updated = await this.copilotThreadModel.findOneAndUpdate(
			{ userId: normalizedUserId, threadId: normalizedThreadId },
			{
				$push: {
					messages: {
						role,
						content: normalizedContent,
						createdAt: new Date(),
					},
				},
				...(shouldCaptureFirstPrompt
					? { $set: { firstPrompt: normalizedContent, title: computedTitle } }
					: {}),
			},
			{ upsert: false, new: true },
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

	async updateCopilotThread(
		userId: string,
		threadId: string,
		input: { isArchived?: boolean; isMuted?: boolean; isDeleted?: boolean },
	) {
		const normalizedUserId = userId.trim();
		const normalizedThreadId = threadId.trim();
		if (!normalizedUserId || !normalizedThreadId) {
			throw new BadRequestException('userId and threadId are required.');
		}

		const patch: Record<string, boolean> = {};
		if (typeof input.isArchived === 'boolean') patch.isArchived = input.isArchived;
		if (typeof input.isMuted === 'boolean') patch.isMuted = input.isMuted;
		if (typeof input.isDeleted === 'boolean') patch.isDeleted = input.isDeleted;
		if (Object.keys(patch).length === 0) {
			throw new BadRequestException('No thread property was provided.');
		}

		const updated = await this.copilotThreadModel.findOneAndUpdate(
			{ userId: normalizedUserId, threadId: normalizedThreadId },
			{ $set: patch },
			{ new: true },
		);
		if (!updated) {
			throw new NotFoundException('Copilot thread not found.');
		}
		return {
			ok: true,
			threadId: updated.threadId,
			isArchived: updated.isArchived,
			isMuted: updated.isMuted,
			isDeleted: updated.isDeleted,
		};
	}

	async resetCopilotHistory(userId: string, threadId?: string) {
		const normalized = userId.trim();
		if (!normalized) {
			throw new BadRequestException('userId must not be empty.');
		}

		if (threadId?.trim()) {
			await this.copilotThreadModel.updateOne(
				{ userId: normalized, threadId: threadId.trim() },
				{ $set: { isDeleted: true } },
			);
			return { ok: true };
		}

		await this.copilotThreadModel.updateMany(
			{ userId: normalized, isDeleted: { $ne: true } },
			{ $set: { isDeleted: true } },
		);
		return { ok: true };
	}

	private buildCopilotTitle(firstPrompt: string) {
		const compact = firstPrompt.replace(/\s+/g, ' ').trim();
		if (!compact) {
			return 'New recruitment chat';
		}
		if (compact.length <= 60) {
			return compact;
		}
		return `${compact.slice(0, 57)}...`;
	}

	private async ensureCopilotThreadIntegrity(thread: CopilotThreadDocument) {
		let changed = false;

		if (!thread.threadId?.trim()) {
			thread.threadId = randomUUID();
			changed = true;
		}

		if (!Array.isArray(thread.messages)) {
			thread.messages = [] as any;
			changed = true;
		}

		const firstUserMessage = thread.messages.find((message) => message?.role === 'user' && message?.content?.trim());
		const normalizedFirstPrompt = firstUserMessage?.content?.trim() ?? '';

		if (!thread.firstPrompt?.trim() && normalizedFirstPrompt) {
			thread.firstPrompt = normalizedFirstPrompt;
			changed = true;
		}

		const desiredTitle = thread.firstPrompt?.trim()
			? this.buildCopilotTitle(thread.firstPrompt)
			: 'New recruitment chat';
		if (!thread.title?.trim() || (thread.title === 'New recruitment chat' && desiredTitle !== thread.title)) {
			thread.title = desiredTitle;
			changed = true;
		}

		if (changed) {
			await thread.save();
		}

		return thread;
	}

	private async ensureCopilotThreadIndexes(forceRepair = false) {
		const collection = this.copilotThreadModel.collection;
		const indexes = await collection.indexes();
		const staleUserIndex = indexes.find((index) => index.name === 'userId_1' && index.unique);

		if (staleUserIndex || forceRepair) {
			try {
				await collection.dropIndex('userId_1');
				this.logger.log('Dropped stale unique index userId_1 from copilot_threads.');
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (!message.includes('index not found')) {
					throw error;
				}
			}
		}

		await this.copilotThreadModel.syncIndexes();
	}

	private isDuplicateUserIndexError(error: unknown) {
		if (!error || typeof error !== 'object') {
			return false;
		}
		const candidate = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
		return candidate.code === 11000
			&& (candidate.keyPattern?.userId === 1 || candidate.message?.includes('index: userId_1') === true);
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

	private mapCvUpload(cv: MulterFile) {
		return {
			originalName: cv.originalname,
			storedName: cv.filename,
			path: cv.path,
			mimeType: cv.mimetype,
			size: cv.size,
		};
	}

	private serializeApplication(application: ApplicationDocument & {
		candidateId?: any;
		jobOfferId?: any;
	}) {
		const candidate = this.serializeCandidate(application.candidateId);
		const jobOffer = this.serializeJobOffer(application.jobOfferId);
		const cv = application.cv
			? {
					originalName: application.cv.originalName,
					storedName: application.cv.storedName,
					path: application.cv.path,
					mimeType: application.cv.mimeType,
					size: application.cv.size,
				}
			: null;
		const ats = application.ats
			? {
					score: application.ats.score,
					skills: [...(application.ats.skills ?? [])],
					experienceSummary: application.ats.experienceSummary,
					missingSkills: [...(application.ats.missingSkills ?? [])],
					analyzedAt:
						application.ats.analyzedAt instanceof Date
							? application.ats.analyzedAt.toISOString()
							: application.ats.analyzedAt
								? new Date(application.ats.analyzedAt).toISOString()
								: null,
				}
			: null;

		return {
			applicationId: application._id.toString(),
			status: application.status,
			trackingToken: application.trackingToken,
			applicationLink: application.trackingToken ? this.buildApplicationLink(application.trackingToken) : null,
			createdAt: application.createdAt ? new Date(application.createdAt).toISOString() : null,
			updatedAt: (application as ApplicationDocument & { updatedAt?: Date }).updatedAt
				? new Date((application as ApplicationDocument & { updatedAt?: Date }).updatedAt as Date).toISOString()
				: null,
			candidate,
			jobOffer,
			cv,
			ats,
		};
	}

	private serializeCandidate(candidate: unknown) {
		if (!candidate || typeof candidate !== 'object') {
			return null;
		}

		const record = candidate as { _id?: unknown; name?: string; email?: string; createdAt?: Date };
		return {
			candidateId: this.toIdString(record._id),
			name: record.name ?? '',
			email: record.email ?? '',
			createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : null,
		};
	}

	private serializeJobOffer(jobOffer: unknown) {
		if (!jobOffer || typeof jobOffer !== 'object') {
			return null;
		}

		const record = jobOffer as {
			_id?: unknown;
			title?: string;
			description?: string;
			responsibilities?: string[];
			requiredSkills?: string[];
			niceToHave?: string[];
			seniorityLevel?: string;
			createdAt?: Date;
		};
		return {
			jobOfferId: this.toIdString(record._id),
			title: record.title ?? '',
			description: record.description ?? '',
			responsibilities: Array.isArray(record.responsibilities) ? record.responsibilities : [],
			requiredSkills: Array.isArray(record.requiredSkills) ? record.requiredSkills : [],
			niceToHave: Array.isArray(record.niceToHave) ? record.niceToHave : [],
			seniorityLevel: record.seniorityLevel ?? '',
			createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : null,
		};
	}

	private toIdString(value: unknown) {
		if (!value) {
			return '';
		}
		if (typeof value === 'string') {
			return value;
		}
		if (typeof (value as { toString?: () => string }).toString === 'function') {
			return (value as { toString: () => string }).toString();
		}
		return '';
	}

	private generateApplicationTrackingToken() {
		return randomBytes(32).toString('hex');
	}

	private buildApplicationLink(token: string) {
		const baseUrl = process.env.FRONTEND_APPLICATION_BASE_URL
			?? process.env.FRONTEND_BASE_URL
			?? 'http://localhost:5173';
		return `${baseUrl.replace(/\/$/, '')}/application/${encodeURIComponent(token)}`;
	}

	private inferDepartment(title: string, description: string) {
		const text = `${title} ${description}`.toLowerCase();
		if (text.includes('backend') || text.includes('frontend') || text.includes('engineer') || text.includes('developer')) return 'Engineering';
		if (text.includes('sales')) return 'Sales';
		if (text.includes('finance')) return 'Finance';
		if (text.includes('marketing')) return 'Marketing';
		if (text.includes('hr') || text.includes('recruit')) return 'Human Resources';
		return 'General';
	}

	private async sendApplicationConfirmationEmail(input: {
		to: string;
		candidateName: string;
		jobTitle: string;
		applicationLink: string;
	}) {
		const html = APPLICATION_CONFIRMATION_EMAIL_TEMPLATE
			.replace('{{CANDIDATE_NAME}}', this.escapeHtml(input.candidateName))
			.replace('{{JOB_TITLE}}', this.escapeHtml(input.jobTitle))
			.replace('{{APPLICATION_LINK}}', input.applicationLink);

		try {
			await this.sendSmtpMail({
				to: input.to,
				subject: `Application received: ${input.jobTitle}`,
				html,
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.logger.warn(`Failed to send application confirmation email: ${reason}`);
		}
	}

	private async sendSmtpMail(input: { to: string; subject: string; html: string }) {
		const host = process.env.MAILTRAP_HOST ?? process.env.SMTP_HOST ?? 'sandbox.smtp.mailtrap.io';
		const port = Number(process.env.MAILTRAP_PORT ?? process.env.SMTP_PORT ?? 2525);
		const user = process.env.MAILTRAP_USER ?? process.env.SMTP_USER;
		const pass = process.env.MAILTRAP_PASS ?? process.env.SMTP_PASS;
		const from = process.env.MAIL_FROM ?? 'Flexity <no-reply@flexity.local>';

		if (!user || !pass) {
			this.logger.warn('Skipping application confirmation email because SMTP credentials are not configured.');
			return;
		}

		const fromAddress = this.extractEmailAddress(from);
		const message = [
			`From: ${from}`,
			`To: ${input.to}`,
			`Subject: ${input.subject}`,
			'MIME-Version: 1.0',
			'Content-Type: text/html; charset=UTF-8',
			'',
			input.html,
		].join('\r\n');

		const socket = await this.openSmtpSocket(host, port);
		try {
			await this.expectSmtp(socket, 220);
			await this.sendSmtpCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST ?? 'localhost'}`, 250);
			await this.sendSmtpCommand(socket, 'AUTH LOGIN', 334);
			await this.sendSmtpCommand(socket, Buffer.from(user).toString('base64'), 334);
			await this.sendSmtpCommand(socket, Buffer.from(pass).toString('base64'), 235);
			await this.sendSmtpCommand(socket, `MAIL FROM:<${fromAddress}>`, 250);
			await this.sendSmtpCommand(socket, `RCPT TO:<${input.to}>`, 250);
			await this.sendSmtpCommand(socket, 'DATA', 354);
			await this.sendSmtpCommand(socket, `${message}\r\n.`, 250);
			await this.sendSmtpCommand(socket, 'QUIT', 221);
		} finally {
			socket.end();
		}
	}

	private openSmtpSocket(host: string, port: number): Promise<Socket | TLSSocket> {
		return new Promise((resolve, reject) => {
			const socket = port === 465
				? tlsConnect({ host, port, servername: host })
				: createConnection({ host, port });
			socket.once('connect', () => resolve(socket));
			socket.once('secureConnect', () => resolve(socket));
			socket.once('error', reject);
		});
	}

	private async sendSmtpCommand(socket: Socket | TLSSocket, command: string, expectedCode: number) {
		socket.write(`${command}\r\n`);
		await this.expectSmtp(socket, expectedCode);
	}

	private expectSmtp(socket: Socket | TLSSocket, expectedCode: number): Promise<void> {
		return new Promise((resolve, reject) => {
			let buffer = '';
			const onData = (chunk: Buffer) => {
				buffer += chunk.toString('utf8');
				const lines = buffer.split(/\r?\n/).filter(Boolean);
				const last = lines[lines.length - 1];
				if (!last || !/^\d{3}\s/.test(last)) {
					return;
				}
				socket.off('data', onData);
				socket.off('error', onError);
				const code = Number(last.slice(0, 3));
				if (code === expectedCode) {
					resolve();
				} else {
					reject(new Error(`SMTP expected ${expectedCode}, received ${last}`));
				}
			};
			const onError = (error: Error) => {
				socket.off('data', onData);
				reject(error);
			};
			socket.on('data', onData);
			socket.once('error', onError);
		});
	}

	private extractEmailAddress(value: string) {
		const match = value.match(/<([^>]+)>/);
		return match?.[1] ?? value;
	}

	private escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	private async buildAtsAnalysis(
		jobOffer: {
			title: string;
			description: string;
			responsibilities: string[];
			requiredSkills: string[];
			niceToHave: string[];
			seniorityLevel: string;
		},
		cv: MulterFile,
	) {
		const cvText = await this.readCvText(cv.path);
		const normalizedCvText = this.normalizeText(cvText);
		const normalizedJobText = this.normalizeText([
			jobOffer.title,
			jobOffer.description,
			...(jobOffer.responsibilities ?? []),
			...(jobOffer.requiredSkills ?? []),
			...(jobOffer.niceToHave ?? []),
			jobOffer.seniorityLevel,
		].join(' '));

		const extractedSkills = this.extractSkillMatches(
			normalizedCvText,
			[...(jobOffer.requiredSkills ?? []), ...(jobOffer.niceToHave ?? [])],
		);
		const missingSkills = (jobOffer.requiredSkills ?? []).filter(
			(skill) => !this.textContainsPhrase(normalizedCvText, skill),
		);
		const score = this.computeAtsScore(
			normalizedCvText,
			normalizedJobText,
			jobOffer.requiredSkills ?? [],
			jobOffer.niceToHave ?? [],
		);

		return {
			score,
			skills: extractedSkills,
			experienceSummary: this.buildExperienceSummary(cvText, jobOffer),
			missingSkills,
			analyzedAt: new Date(),
		};
	}

	private async readCvText(filePath: string) {
		const buffer = await readFile(filePath);
		return buffer.toString('utf8');
	}

	private normalizeText(input: string) {
		return input
			.toLowerCase()
			.replace(/[\u0000-\u001f]+/g, ' ')
			.replace(/[^a-z0-9+#./\s-]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private extractSkillMatches(cvText: string, skillCandidates: string[]) {
		const matches = skillCandidates
			.map((skill) => skill.trim())
			.filter((skill) => skill.length > 0)
			.filter((skill) => this.textContainsPhrase(cvText, skill));

		return [...new Set(matches)];
	}

	private textContainsPhrase(text: string, phrase: string) {
		const normalizedPhrase = this.normalizeText(phrase);
		if (!normalizedPhrase) {
			return false;
		}
		return text.includes(normalizedPhrase);
	}

	private computeAtsScore(
		cvText: string,
		jobText: string,
		requiredSkills: string[],
		niceToHave: string[],
	) {
		const matchedRequired = requiredSkills.filter((skill) => this.textContainsPhrase(cvText, skill)).length;
		const matchedNice = niceToHave.filter((skill) => this.textContainsPhrase(cvText, skill)).length;
		const requirementCoverage = requiredSkills.length > 0 ? matchedRequired / requiredSkills.length : 1;
		const niceCoverage = niceToHave.length > 0 ? matchedNice / niceToHave.length : 1;
		const overlapBonus = this.keywordOverlapScore(cvText, jobText);
		const contentBonus = this.hasSubstantialContent(cvText) ? 5 : 0;
		const rawScore = requirementCoverage * 65 + niceCoverage * 15 + overlapBonus * 15 + contentBonus;
		return Math.max(0, Math.min(100, Math.round(rawScore)));
	}

	private keywordOverlapScore(cvText: string, jobText: string) {
		const cvTokens = new Set(this.tokenize(cvText));
		const jobTokens = this.tokenize(jobText);
		if (jobTokens.length === 0) {
			return 0;
		}

		const overlap = new Set(jobTokens.filter((token) => cvTokens.has(token)));
		return Math.min(1, overlap.size / Math.max(8, jobTokens.length * 0.35));
	}

	private tokenize(text: string) {
		return this.normalizeText(text)
			.split(' ')
			.map((token) => token.trim())
			.filter((token) => token.length >= 2)
			.filter((token) => !this.isStopWord(token));
	}

	private isStopWord(token: string) {
		return new Set([
			'a',
			'an',
			'the',
			'and',
			'or',
			'for',
			'with',
			'to',
			'of',
			'in',
			'on',
			'at',
			'by',
			'is',
			'are',
			'be',
			'was',
			'were',
			'from',
			'as',
			'it',
			'this',
			'that',
			'we',
			'you',
			'will',
			'our',
			'your',
			'job',
			'role',
			'position',
			'description',
			'responsibilities',
			'required',
			'skills',
		]).has(token);
	}

	private hasSubstantialContent(cvText: string) {
		return this.tokenize(cvText).length >= 30 || cvText.length >= 300;
	}

	private buildExperienceSummary(cvText: string, jobOffer: { seniorityLevel: string; title: string }) {
		const experienceSignals = [
			/\b(\d+)\+?\s+years?\b/i,
			/\byears? of experience\b/i,
			/\bsenior\b/i,
			/\bmid(?:-level)?\b/i,
			/\bjunior\b/i,
			/\bintern\b/i,
		];

		const matchedSignal = experienceSignals.find((pattern) => pattern.test(cvText));
		const detectedExperience = matchedSignal ? cvText.match(matchedSignal)?.[0] ?? 'experience' : 'experience';
		const targetLevel = jobOffer.seniorityLevel?.trim() || 'unspecified level';
		return `CV suggests ${detectedExperience.toLowerCase()} and is evaluated against a ${targetLevel} ${jobOffer.title} role.`;
	}

	private async rollbackApplicationArtifacts(candidateId: string, cvPath: string) {
		await this.candidateModel.deleteOne({ _id: candidateId });

		if (cvPath && existsSync(cvPath)) {
			try {
				await unlink(cvPath);
			} catch {
				this.logger.warn(`Failed to remove uploaded CV during rollback: ${cvPath}`);
			}
		}
	}

	getCvUploadDirectory() {
		return join(process.cwd(), 'uploads', 'cvs');
	}
}
