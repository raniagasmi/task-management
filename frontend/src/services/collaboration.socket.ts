import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';
import { CollaborationMessage, CollaborationTaskProposal } from './collaboration.service';
import { authService } from './auth.service';

type TypingPayload = {
  conversationId: string;
  userId: string;
};

type ProposalEventPayload = {
  conversationId?: string;
  proposals?: CollaborationTaskProposal[];
  proposal?: CollaborationTaskProposal;
  proposalId?: string;
  assignedTo?: string;
  userIds?: string[];
};

class CollaborationSocketService {
  private socket: Socket | null = null;
  private registeredUserId = '';

  private currentUserId() {
    const user = authService.getCurrentUser() as { id?: string; _id?: string; userId?: string } | null;
    return user?.id ?? user?._id ?? user?.userId ?? '';
  }

  private ensureUserRegistration() {
    const userId = this.currentUserId();
    if (!userId || !this.socket || this.registeredUserId === userId) {
      return;
    }

    this.socket.emit('registerUser', { userId });
    this.registeredUserId = userId;
  }

  connect() {
    if (this.socket?.connected) {
      this.ensureUserRegistration();
      return this.socket;
    }

    this.socket = io(`${API_BASE_URL}/collaboration`, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.ensureUserRegistration();
    });

    this.ensureUserRegistration();

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.registeredUserId = '';
  }

  joinConversation(conversationId: string) {
    this.connect().emit('joinConversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.connect().emit('leaveConversation', { conversationId });
  }

  sendMessage(conversationId: string, message: CollaborationMessage) {
    this.connect().emit('sendMessage', { conversationId, message });
  }

  startTyping(conversationId: string, userId: string) {
    this.connect().emit('typing:start', { conversationId, userId } satisfies TypingPayload);
  }

  stopTyping(conversationId: string, userId: string) {
    this.connect().emit('typing:stop', { conversationId, userId } satisfies TypingPayload);
  }

  onNewMessage(handler: (message: CollaborationMessage) => void) {
    const socket = this.connect();
    socket.on('newMessage', handler);
    socket.on('message:new', (payload: { message?: CollaborationMessage } | CollaborationMessage) => {
      if (payload && typeof payload === 'object' && 'message' in payload && payload.message) {
        handler(payload.message);
        return;
      }

      handler(payload as CollaborationMessage);
    });

    return () => {
      socket.off('newMessage', handler);
      socket.off('message:new');
    };
  }

  onAiGeneratedTasks(handler: (payload: ProposalEventPayload) => void) {
    const socket = this.connect();
    socket.on('aiGeneratedTasks', handler);
    socket.on('ai:tasks-generated', handler);

    return () => {
      socket.off('aiGeneratedTasks', handler);
      socket.off('ai:tasks-generated', handler);
    };
  }

  onTaskAssigned(handler: (payload: ProposalEventPayload) => void) {
    const socket = this.connect();
    socket.on('taskAssigned', handler);
    socket.on('taskAssignedNotification', handler);

    return () => {
      socket.off('taskAssigned', handler);
      socket.off('taskAssignedNotification', handler);
    };
  }

  onConversationNew(handler: (payload: ProposalEventPayload) => void) {
    const socket = this.connect();
    socket.on('conversation:new', handler);

    return () => {
      socket.off('conversation:new', handler);
    };
  }

  onTypingStart(handler: (payload: TypingPayload) => void) {
    const socket = this.connect();
    socket.on('typing:start', handler);

    return () => {
      socket.off('typing:start', handler);
    };
  }

  onTypingStop(handler: (payload: TypingPayload) => void) {
    const socket = this.connect();
    socket.on('typing:stop', handler);

    return () => {
      socket.off('typing:stop', handler);
    };
  }
}

export const collaborationSocket = new CollaborationSocketService();
