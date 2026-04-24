import {
  ConnectedSocket,
  OnGatewayDisconnect,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Server, Socket } from 'socket.io';
import { firstValueFrom } from 'rxjs';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @SubscribeMessage('registerUser')
  registerUser(
    @MessageBody() body: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.userId) {
      client.data.userId = body.userId;
      client.join(this.userRoom(body.userId));
      this.clearDisconnectTimer(body.userId);
    }

    return { ok: true };
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) {
      return;
    }

    this.scheduleOfflineUpdate(userId);
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

  emitPresenceUpdated(payload: { userId: string; status: string; lastActiveAt: string | null; updatedAt: string | null }) {
    this.server?.emit('presence:updated', payload);
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

  private clearDisconnectTimer(userId: string) {
    const existing = this.disconnectTimers.get(userId);
    if (existing) {
      clearTimeout(existing);
      this.disconnectTimers.delete(userId);
    }
  }

  private scheduleOfflineUpdate(userId: string) {
    this.clearDisconnectTimer(userId);

    const timeout = setTimeout(async () => {
      const sockets = await this.server?.in(this.userRoom(userId)).fetchSockets();
      if (sockets && sockets.length > 0) {
        this.disconnectTimers.delete(userId);
        return;
      }

      try {
        const updatedUser = await firstValueFrom(
          this.userClient.send('user_update_presence', {
            id: userId,
            data: { status: 'OFFLINE' },
          }),
        );

        this.emitPresenceUpdated({
          userId,
          status: updatedUser?.presenceStatus ?? 'OFFLINE',
          lastActiveAt: updatedUser?.lastActiveAt ? new Date(updatedUser.lastActiveAt).toISOString() : null,
          updatedAt: updatedUser?.presenceUpdatedAt ? new Date(updatedUser.presenceUpdatedAt).toISOString() : null,
        });
      } catch (error) {
        console.error('Failed to update presence on disconnect:', error);
      } finally {
        this.disconnectTimers.delete(userId);
      }
    }, 10000);

    this.disconnectTimers.set(userId, timeout);
  }
}
