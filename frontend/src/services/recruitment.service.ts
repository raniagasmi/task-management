import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.config';
import api from './api.service';

export interface JobOffer {
	id?: string;
	_id?: string;
	jobOfferId?: string;
	title: string;
	description: string;
	responsibilities: string[];
	requiredSkills: string[];
	niceToHave: string[];
	seniorityLevel: 'intern' | 'junior' | 'mid' | 'senior';
}

export interface ChatCollectedData {
	title?: string;
	skills?: string[];
	experienceLevel?: 'intern' | 'junior' | 'mid' | 'senior';
	additionalContext?: string;
}

export type ChatResponse =
	| {
			sessionId: string;
			currentStep: 'title' | 'skills' | 'experienceLevel' | 'additionalContext';
			nextQuestion: string;
			isComplete: false;
			collectedData: ChatCollectedData;
		}
	| {
			sessionId: string;
			currentStep: 'complete';
			isComplete: true;
			jobOffer: JobOffer;
			collectedData: ChatCollectedData;
		};

class RecruitmentService {
	private buildAxiosErrorMessage(prefix: string, error: unknown): Error {
		if (!axios.isAxiosError(error)) {
			return new Error(prefix);
		}

		const responseMessage =
			typeof error.response?.data?.message === 'string'
				? error.response.data.message
				: undefined;

		const fallback = error.message || `HTTP ${error.response?.status ?? 'error'}`;
		return new Error(`${prefix}: ${responseMessage ?? fallback}`);
	}

	async generateJobOffer(prompt: string): Promise<JobOffer> {
		try {
			const response = await api.post<JobOffer>(API_ENDPOINTS.RECRUITMENT.GENERATE, { prompt });
			return response.data;
		} catch (error) {
			throw this.buildAxiosErrorMessage('Failed to generate job offer', error);
		}
	}

	async sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
		try {
			const response = await api.post<ChatResponse>(API_ENDPOINTS.RECRUITMENT.CHAT, {
				sessionId,
				message,
			});
			return response.data;
		} catch (error) {
			throw this.buildAxiosErrorMessage('Failed to send chat message', error);
		}
	}

	async generateLinkedInPost(jobOfferId: string): Promise<string> {
		try {
			const response = await api.post<string>(API_ENDPOINTS.RECRUITMENT.LINKEDIN, {
				jobOfferId,
			});
			return response.data;
		} catch (error) {
			throw this.buildAxiosErrorMessage('Failed to generate LinkedIn post', error);
		}
	}
}

export const recruitmentService = new RecruitmentService();
