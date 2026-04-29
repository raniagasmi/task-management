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

export type ApplicationStatus = 'Applied' | 'Interview' | 'Accepted' | 'Rejected';

export interface RecruitmentJobSummary {
  jobOfferId: string;
  title: string;
  department: string;
  status: 'Open' | 'Closed';
  postedAt: string;
  date?: string | null;
  description?: string;
  responsibilities?: string[];
  requiredSkills?: string[];
  niceToHave?: string[];
  seniorityLevel?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface ApplicationDetails {
  applicationId: string;
  status: ApplicationStatus;
  trackingToken?: string;
  applicationLink?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  candidate: {
    candidateId: string;
    name: string;
    email: string;
    createdAt: string | null;
  } | null;
  jobOffer: {
    jobOfferId: string;
    title: string;
    description: string;
    responsibilities: string[];
    requiredSkills: string[];
    niceToHave: string[];
    seniorityLevel: string;
    createdAt: string | null;
  } | null;
  cv: {
    originalName: string;
    storedName: string;
    path: string;
    mimeType: string;
    size: number;
  } | null;
  ats: {
    score: number;
    skills: string[];
    experienceSummary: string;
    missingSkills: string[];
    analyzedAt: string | null;
  } | null;
}

export interface ApplicationsByJobResponse {
  jobOfferId: string;
  total: number;
  applications: ApplicationDetails[];
}

export interface ApplicationPipelineResponse {
  jobOfferId: string;
  total: number;
  counts: Record<ApplicationStatus, number>;
  pipeline: Record<ApplicationStatus, ApplicationDetails[]>;
}

export interface ApplyResponse {
  applicationId: string;
  status: ApplicationStatus;
  token: string;
  applicationLink: string;
}

class RecruitmentService {
  private readonly jobsCacheKey = 'recruitment_jobs_cache_v1';

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

  private normalizeApplicationsByJobResponse(data: ApplicationsByJobResponse): ApplicationsByJobResponse {
    return {
      jobOfferId: data.jobOfferId,
      total: data.total ?? 0,
      applications: Array.isArray(data.applications) ? data.applications : [],
    };
  }

  private readJobsCache(): RecruitmentJobSummary[] {
    try {
      const raw = localStorage.getItem(this.jobsCacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecruitmentJobSummary[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJobsCache(jobs: RecruitmentJobSummary[]) {
    localStorage.setItem(this.jobsCacheKey, JSON.stringify(jobs));
  }

  addJobToCache(offer: JobOffer) {
    const jobOfferId = offer.id ?? offer._id ?? offer.jobOfferId ?? '';
    if (!jobOfferId) {
      return;
    }

    const next: RecruitmentJobSummary = {
      jobOfferId,
      title: offer.title,
      department: this.inferDepartment(offer),
      status: 'Open',
      postedAt: new Date().toISOString(),
    };

    const existing = this.readJobsCache();
    if (existing.some((item) => item.jobOfferId === jobOfferId)) {
      return;
    }
    this.writeJobsCache([next, ...existing]);
  }

  private inferDepartment(offer: JobOffer) {
    const haystack = `${offer.title} ${offer.description}`.toLowerCase();
    if (haystack.includes('backend') || haystack.includes('api')) return 'Engineering';
    if (haystack.includes('frontend') || haystack.includes('ui')) return 'Product';
    if (haystack.includes('sales')) return 'Sales';
    if (haystack.includes('hr') || haystack.includes('recruit')) return 'Human Resources';
    if (haystack.includes('finance')) return 'Finance';
    return 'General';
  }

  async listRecruitmentJobs(): Promise<RecruitmentJobSummary[]> {
    try {
      const response = await api.get<RecruitmentJobSummary[]>(API_ENDPOINTS.RECRUITMENT.ADMIN_JOBS);
      if (Array.isArray(response.data) && response.data.length > 0) {
        this.writeJobsCache(response.data);
        return response.data;
      }
      return this.readJobsCache();
    } catch {
      return this.readJobsCache();
    }
  }

  async closeJobOffer(jobOfferId: string): Promise<{ ok: true; jobOfferId: string }> {
    try {
      const response = await api.delete<{ ok: true; jobOfferId: string }>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_JOB(jobOfferId),
      );
      const remainingJobs = this.readJobsCache().filter((job) => job.jobOfferId !== jobOfferId);
      this.writeJobsCache(remainingJobs);
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to close applications', error);
    }
  }

  async listPublicJobs(): Promise<RecruitmentJobSummary[]> {
    try {
      const response = await api.get<RecruitmentJobSummary[]>(API_ENDPOINTS.RECRUITMENT.PUBLIC_JOBS);
      const jobs = Array.isArray(response.data) ? response.data : [];
      if (jobs.length > 0) {
        this.writeJobsCache(jobs);
      }
      return jobs;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load job offers', error);
    }
  }

  async applyToJob(jobOfferId: string, input: { name: string; email: string; cv: File }): Promise<ApplyResponse> {
    try {
      const form = new FormData();
      form.append('name', input.name);
      form.append('email', input.email);
      form.append('cv', input.cv);
      const response = await api.post<ApplyResponse>(
        API_ENDPOINTS.RECRUITMENT.PUBLIC_APPLY(jobOfferId),
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to submit application', error);
    }
  }

  async trackApplication(token: string): Promise<ApplicationDetails> {
    try {
      const response = await api.get<ApplicationDetails>(
        API_ENDPOINTS.RECRUITMENT.TRACK_APPLICATION(token),
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load application tracking', error);
    }
  }

  async listApplicationsByJobOfferId(jobOfferId: string, status?: ApplicationStatus): Promise<ApplicationsByJobResponse> {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await api.get<ApplicationsByJobResponse>(
        `${API_ENDPOINTS.RECRUITMENT.ADMIN_JOB_APPLICATIONS(jobOfferId)}${query}`,
      );
      return this.normalizeApplicationsByJobResponse(response.data);
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load job applications', error);
    }
  }

  async getApplicationById(applicationId: string): Promise<ApplicationDetails> {
    try {
      const response = await api.get<ApplicationDetails>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_APPLICATION(applicationId),
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load application details', error);
    }
  }

  async updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<ApplicationDetails> {
    try {
      const response = await api.patch<ApplicationDetails>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_APPLICATION_STATUS(applicationId),
        { status },
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to update application status', error);
    }
  }

  async getApplicationPipelineByJobOfferId(jobOfferId: string): Promise<ApplicationPipelineResponse> {
    try {
      const response = await api.get<ApplicationPipelineResponse>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_JOB_PIPELINE(jobOfferId),
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load application pipeline', error);
    }
  }

  async approveJobOffer(jobOfferId: string): Promise<{ ok: boolean; jobOfferId: string; approvalStatus: string }> {
    try {
      const response = await api.patch<{ ok: boolean; jobOfferId: string; approvalStatus: string }>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_JOB_APPROVE(jobOfferId),
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to approve job offer', error);
    }
  }

  async rejectJobOffer(jobOfferId: string): Promise<{ ok: boolean; jobOfferId: string; approvalStatus: string }> {
    try {
      const response = await api.patch<{ ok: boolean; jobOfferId: string; approvalStatus: string }>(
        API_ENDPOINTS.RECRUITMENT.ADMIN_JOB_REJECT(jobOfferId),
      );
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to reject job offer', error);
    }
  }
}

export const recruitmentService = new RecruitmentService();
