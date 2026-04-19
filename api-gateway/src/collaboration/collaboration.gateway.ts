import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CollaborationGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('registerUser')
  registerUser(
    @MessageBody() body: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.userId) {
      client.join(this.userRoom(body.userId));
    }

    return { ok: true };
  }

  @SubscribeMessage('joinConversation')
  joinConversation(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(this.roomName(body.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('leaveConversation')
  leaveConversation(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(this.roomName(body.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('sendMessage')
  sendMessage(
    @MessageBody() body: { conversationId: string; message: unknown },
  ) {
    this.server?.to(this.roomName(body.conversationId)).emit('newMessage', body.message);
    return { ok: true };
  }

  @SubscribeMessage('typing:start')
  typingStart(
    @MessageBody() body: { conversationId: string; userId: string },
  ) {
    this.server?.to(this.roomName(body.conversationId)).emit('typing:start', body);
    return { ok: true };
  }

  @SubscribeMessage('typing:stop')
  typingStop(
    @MessageBody() body: { conversationId: string; userId: string },
  ) {
    this.server?.to(this.roomName(body.conversationId)).emit('typing:stop', body);
    return { ok: true };
  }

  emitConversationNew(payload: { conversationId: string; userIds?: string[]; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'conversation:new');

    const recipientIds = Array.from(new Set((payload.userIds ?? []).filter(Boolean)));
    recipientIds.forEach((userId) => {
      this.server?.to(this.userRoom(userId)).emit('conversation:new', payload);
    });
  }

  emitMessageNew(payload: { conversationId: string; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'message:new');
  }

  emitAiGeneratedTasks(payload: { conversationId: string; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'ai:tasks-generated');
  }

  emitProposalApproved(payload: { conversationId: string; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'proposal:approved');
  }

  emitProposalUpdates(payload: { conversationId: string; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'proposalUpdates');
  }

  emitTaskAssignedNotification(payload: { assignedTo: string; [key: string]: unknown }) {
    this.server?.to(this.userRoom(payload.assignedTo)).emit('taskAssignedNotification', payload);
  }

  emitTaskCreated(payload: { conversationId: string; [key: string]: unknown }) {
    this.emitToConversationRoom(payload, 'task:created');
  }

  private emitToConversationRoom(payload: { conversationId: string }, eventName: string) {
    this.server?.to(this.roomName(payload.conversationId)).emit(eventName, payload);
  }

  private roomName(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
