import axios from 'axios';
import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import { authService } from './auth.service';

export interface ConversationParticipant {
  userId: string;
  role: string;
  skills: string[];
  isActive?: boolean;
  canApproveTasks?: boolean;
  canSendMessages?: boolean;
  joinedAt?: string;
}

export interface CollaborationConversation {
  id?: string;
  _id?: string;
  title: string;
  adminId: string;
  memberIds: string[];
  participants?: ConversationParticipant[];
  status?: string;
  lastMessageAt?: string;
  lastMessage?: string;
  unreadCount?: number;
}

export interface CollaborationMessage {
  id?: string;
  _id?: string;
  conversationId: string;
  senderId: string;
  senderType: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  timestamp?: string;
}

export interface CollaborationTaskProposal {
  id?: string;
  _id?: string;
  conversationId: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'DRAFT' | 'APPROVED' | 'REJECTED';
  createdTaskId?: string;
}

export interface CreateConversationPayload {
  title: string;
  members: string[];
  prompt: string;
}

export interface ConversationCreatedResponse {
  conversation: CollaborationConversation;
  proposals: CollaborationTaskProposal[];
  tasks: Array<{
    title: string;
    description: string;
    assignedTo: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface AiDecomposeResponse {
  tasks: Array<{
    title: string;
    description: string;
    assignedTo: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  proposals: CollaborationTaskProposal[];
}

class CollaborationService {
  private proposalCache = new Map<string, CollaborationTaskProposal[]>();

  private currentUserId(): string {
    const currentUser = authService.getCurrentUser();
    return currentUser?.id ?? '';
  }

  private cacheProposals(conversationId: string, proposals: CollaborationTaskProposal[]) {
    if (!conversationId) {
      return;
    }

    this.proposalCache.set(conversationId, proposals);
  }

  private updateCachedProposal(conversationId: string, proposalId: string, status: 'APPROVED' | 'REJECTED') {
    const cached = this.proposalCache.get(conversationId);
    if (!cached) {
      return;
    }

    const next = cached.map((proposal) =>
      (proposal.id ?? proposal._id) === proposalId ? { ...proposal, status } : proposal,
    );

    this.proposalCache.set(conversationId, next);
  }

  async getUserConversations(): Promise<CollaborationConversation[]> {
    const userId = this.currentUserId();
    if (!userId) {
      return [];
    }

    try {
      const response = await api.get<CollaborationConversation[]>(
        API_ENDPOINTS.COLLABORATION.CONVERSATIONS_BY_USER(userId),
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to load conversations: ${error.message}`);
      }

      throw error;
    }
  }

  async getMessages(conversationId: string): Promise<CollaborationMessage[]> {
    try {
      const response = await api.get<CollaborationMessage[]>(
        API_ENDPOINTS.COLLABORATION.MESSAGES(conversationId),
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to load messages: ${error.message}`);
      }

      throw error;
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<CollaborationMessage> {
    const senderId = this.currentUserId();

    try {
      const response = await api.post<CollaborationMessage>(
        API_ENDPOINTS.COLLABORATION.MESSAGES(conversationId),
        {
          senderId,
          content,
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      throw error;
    }
  }

  async createConversation(data: CreateConversationPayload): Promise<ConversationCreatedResponse> {
    try {
      const response = await api.post<ConversationCreatedResponse>(
        API_ENDPOINTS.COLLABORATION.CONVERSATIONS,
        data,
      );

      const conversationId = response.data.conversation.id ?? response.data.conversation._id ?? '';
      this.cacheProposals(conversationId, response.data.proposals ?? []);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      throw error;
    }
  }

  async aiDecompose(conversationId: string): Promise<AiDecomposeResponse> {
    try {
      const response = await api.post<AiDecomposeResponse>(
        API_ENDPOINTS.COLLABORATION.AI_DECOMPOSE(conversationId),
      );

      this.cacheProposals(conversationId, response.data.proposals ?? []);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to generate AI tasks: ${error.message}`);
      }

      throw error;
    }
  }

  async rejectProposal(proposalId: string, conversationId: string): Promise<CollaborationTaskProposal> {
    try {
      const response = await api.post<CollaborationTaskProposal>(
        API_ENDPOINTS.COLLABORATION.REJECT_PROPOSAL(proposalId),
        {
          adminId: this.currentUserId(),
        },
      );

      this.updateCachedProposal(conversationId, proposalId, 'REJECTED');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to reject proposal: ${error.message}`);
      }

      throw error;
    }
  }

  async approveProposal(proposalId: string, conversationId: string): Promise<CollaborationTaskProposal> {
    try {
      const response = await api.post<CollaborationTaskProposal>(
        API_ENDPOINTS.COLLABORATION.APPROVE_PROPOSAL(proposalId),
        {
          adminId: this.currentUserId(),
        },
      );

      this.updateCachedProposal(conversationId, proposalId, 'APPROVED');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to approve proposal: ${error.message}`);
      }

      throw error;
    }
  }

  async approveTasks(conversationId: string): Promise<CollaborationTaskProposal[]> {
    const cached = this.proposalCache.get(conversationId) ?? [];
    const draftProposals = cached.filter((proposal) => (proposal.status ?? 'DRAFT') === 'DRAFT');

    if (draftProposals.length === 0) {
      return [];
    }

    const approved: CollaborationTaskProposal[] = [];

    for (const proposal of draftProposals) {
      const proposalId = proposal.id ?? proposal._id;
      if (!proposalId) {
        continue;
      }

      try {
        const response = await this.approveProposal(proposalId, conversationId);
        approved.push(response);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Failed to approve proposal ${proposal.title}: ${error.message}`);
        }

        throw error;
      }
    }

    this.proposalCache.delete(conversationId);
    return approved;
  }

  getCachedProposals(conversationId: string): CollaborationTaskProposal[] {
    return this.proposalCache.get(conversationId) ?? [];
  }
}

export const collaborationService = new CollaborationService();
