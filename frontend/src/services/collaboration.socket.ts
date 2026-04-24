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

type PresencePayload = {
  userId: string;
  status: 'ONLINE' | 'PAUSE' | 'OFFLINE';
  lastActiveAt: string | null;
  updatedAt: string | null;
};

type TaskReminderPayload = {
  userId: string;
  reminderId: string;
  taskId: string;
  taskTitle: string;
  remindAt: string;
  taskDueDate: string | null;
};

class CollaborationSocketService {
  private socket: Socket | null = null;
  private registeredUserId = '';
  private joinedConversationIds = new Set<string>();

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

  private restoreConversationSubscriptions() {
    if (!this.socket) {
      return;
    }

    this.joinedConversationIds.forEach((conversationId) => {
      this.socket?.emit('joinConversation', { conversationId });
    });
  }

  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }

      this.ensureUserRegistration();
      this.restoreConversationSubscriptions();
      return this.socket;
    }

    this.socket = io(`${API_BASE_URL}/collaboration`, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      this.ensureUserRegistration();
      this.restoreConversationSubscriptions();
    });

    this.socket.connect();
    this.ensureUserRegistration();
    this.restoreConversationSubscriptions();

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.registeredUserId = '';
  }

  joinConversation(conversationId: string) {
    if (!conversationId) {
      return;
    }

    this.joinedConversationIds.add(conversationId);
    this.connect().emit('joinConversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    if (!conversationId) {
      return;
    }

    this.joinedConversationIds.delete(conversationId);
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

  onPresenceUpdated(handler: (payload: PresencePayload) => void) {
    const socket = this.connect();
    socket.on('presence:updated', handler);

    return () => {
      socket.off('presence:updated', handler);
    };
  }

  onTaskReminder(handler: (payload: TaskReminderPayload) => void) {
    const socket = this.connect();
    socket.on('task:reminder', handler);

    return () => {
      socket.off('task:reminder', handler);
    };
  }
}

export const collaborationSocket = new CollaborationSocketService();
