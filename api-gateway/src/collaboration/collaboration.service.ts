import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface ConversationCreatedResponse {
  conversation: {
    _id?: string;
    id?: string;
  };
  proposals: Array<{
    conversationId: string;
    assignedTo: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'DRAFT' | 'APPROVED' | 'REJECTED';
    createdTaskId?: string;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    assignedTo: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface CollaborationProposalResponse {
  conversationId: string;
  assignedTo: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  createdTaskId?: string;
}

@Injectable()
export class CollaborationService {
  private readonly baseUrl = `http://${process.env.CONVERSATION_SERVICE_HOST ?? 'conversation-service'}:${process.env.CONVERSATION_SERVICE_PORT ?? '3006'}`;

  async createConversation(body: unknown) {
    return this.forwardPost('/collaboration/conversations', body);
  }

  async getConversationsForUser(userId: string) {
    return this.forwardGet(`/collaboration/conversations/user/${userId}`);
  }

  async getMessages(conversationId: string) {
    return this.forwardGet(`/collaboration/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, body: unknown) {
    return this.forwardPost(`/collaboration/conversations/${conversationId}/messages`, body);
  }

  async decompose(conversationId: string, body: unknown) {
    return this.forwardPost(`/collaboration/conversations/${conversationId}/ai-decompose`, body);
  }

  async runAiDecomposition(conversationId: string, body: unknown) {
    return this.decompose(conversationId, body);
  }

  async approveProposal(proposalId: string, body: unknown) {
    return this.forwardPost(`/collaboration/proposals/${proposalId}/approve`, body);
  }

  async rejectProposal(proposalId: string, body: unknown) {
    return this.forwardPost(`/collaboration/proposals/${proposalId}/reject`, body);
  }

  private async forwardGet(path: string) {
    return this.forward('GET', path);
  }

  private async forwardPost(path: string, body: unknown) {
    return this.forward('POST', path, body);
  }

  private async forward(method: 'GET' | 'POST', path: string, body?: unknown) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await response.text();
      const payload = this.safeParseJson(text);

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'message' in payload
            ? (payload as { message?: unknown }).message
            : undefined) ?? 'Collaboration service request failed';

        throw new HttpException(
          typeof message === 'string' ? message : 'Collaboration service request failed',
          response.status,
        );
      }

      return payload ?? text;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : 'Unknown network error';
      throw new ServiceUnavailableException(
        `Collaboration service is unavailable: ${reason}`,
      );
    }
  }

  private safeParseJson(value: string): unknown | null {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
