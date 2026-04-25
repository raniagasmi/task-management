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

export type CopilotMessageRole = 'user' | 'assistant';

export interface CopilotMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
  createdAt: string | null;
}

export interface CopilotHistoryResponse {
  userId: string;
  threadId?: string;
  title?: string;
  firstPrompt?: string;
  isArchived?: boolean;
  isMuted?: boolean;
  messages: CopilotMessage[];
}

export interface CopilotThreadSummary {
  threadId: string;
  title: string;
  firstPrompt: string;
  isArchived: boolean;
  isMuted: boolean;
  updatedAt: string | null;
  lastMessagePreview: string;
}

export interface CopilotThreadsResponse {
  userId: string;
  threads: CopilotThreadSummary[];
}

export interface CopilotThreadResponse {
  userId: string;
  threadId: string;
  title: string;
  firstPrompt: string;
  isArchived: boolean;
  isMuted: boolean;
  messages: CopilotMessage[];
}

class RecruitmentService {
	private normalizeThreadId(threadId: unknown): string {
		return typeof threadId === 'string' ? threadId.trim() : '';
	}

	private assertThreadId(threadId: unknown): string {
		const normalized = this.normalizeThreadId(threadId);
		if (!normalized) {
			throw new Error('Copilot thread is missing a valid threadId.');
		}
		return normalized;
	}

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

  async getCopilotHistory(): Promise<CopilotHistoryResponse> {
    try {
      const response = await api.get<CopilotHistoryResponse>(API_ENDPOINTS.RECRUITMENT.COPILOT_HISTORY);
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load copilot history', error);
    }
  }

  async appendCopilotMessage(role: CopilotMessageRole, content: string): Promise<{ ok: true; message: CopilotMessage | null }> {
    try {
      const threadId = this.assertThreadId(this.activeThreadId);
      const response = await api.post<{ ok: true; message: CopilotMessage | null }>(
        API_ENDPOINTS.RECRUITMENT.COPILOT_MESSAGE,
        { threadId, role, content },
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to persist copilot message', error);
    }
  }

  async resetCopilotHistory(): Promise<{ ok: true }> {
    try {
      const response = await api.post<{ ok: true }>(API_ENDPOINTS.RECRUITMENT.COPILOT_RESET);
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to reset copilot history', error);
    }
  }

  private activeThreadId = '';

  setActiveThreadId(threadId: string) {
    this.activeThreadId = this.normalizeThreadId(threadId);
  }

  async listCopilotThreads(): Promise<CopilotThreadsResponse> {
    try {
      const response = await api.get<CopilotThreadsResponse>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREADS);
      return {
        ...response.data,
        threads: (response.data.threads ?? [])
          .map((thread) => ({
            ...thread,
            threadId: this.normalizeThreadId(thread.threadId),
            title: thread.title?.trim() || 'New recruitment chat',
            firstPrompt: thread.firstPrompt ?? '',
            isArchived: !!thread.isArchived,
            isMuted: !!thread.isMuted,
            lastMessagePreview: thread.lastMessagePreview ?? '',
          }))
          .filter((thread) => !!thread.threadId),
      };
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load copilot threads', error);
    }
  }

  async getCopilotThread(threadId: string): Promise<CopilotThreadResponse> {
    try {
      const normalizedThreadId = this.assertThreadId(threadId);
      const response = await api.get<CopilotThreadResponse>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREAD(normalizedThreadId));
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load copilot thread', error);
    }
  }

  async createCopilotThread(): Promise<CopilotThreadResponse> {
    try {
      const response = await api.post<CopilotThreadResponse>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREADS);
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to create copilot thread', error);
    }
  }

  async archiveCopilotThread(threadId: string, isArchived: boolean): Promise<{ ok: true }> {
    try {
      const normalizedThreadId = this.assertThreadId(threadId);
      const response = await api.post<{ ok: true }>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREAD_ARCHIVE(normalizedThreadId), {
        isArchived,
      });
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to archive copilot thread', error);
    }
  }

  async muteCopilotThread(threadId: string, isMuted: boolean): Promise<{ ok: true }> {
    try {
      const normalizedThreadId = this.assertThreadId(threadId);
      const response = await api.post<{ ok: true }>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREAD_MUTE(normalizedThreadId), {
        isMuted,
      });
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to mute copilot thread', error);
    }
  }

  async deleteCopilotThread(threadId: string): Promise<{ ok: true }> {
    try {
      const normalizedThreadId = this.assertThreadId(threadId);
      const response = await api.post<{ ok: true }>(API_ENDPOINTS.RECRUITMENT.COPILOT_THREAD_DELETE(normalizedThreadId));
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to delete copilot thread', error);
    }
  }
}

export const recruitmentService = new RecruitmentService();
