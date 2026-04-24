import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { Model } from 'mongoose';
import { Conversation, ConversationParticipant } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';
import { TaskProposal } from './schemas/task-proposal.schema';
import { CreateConversationDto, SendMessageDto } from './dto/create-conversation.dto';
import { AiService } from './ai.service';

type UserProfile = {
  id?: string;
  _id?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  fullName: string;
};

type StructuredSystemMessage = {
  taskId?: string;
  taskTitle?: string;
  assigneeId?: string;
  assigneeName?: string;
};

@Injectable()
export class CollaborationService {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('TASK_SERVICE') private readonly taskClient: ClientProxy,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(TaskProposal.name) private readonly proposalModel: Model<TaskProposal>,
    private readonly aiService: AiService,
  ) {}

  async createConversation(input: CreateConversationDto, adminId: string) {
    if (!input.title.trim()) {
      throw new BadRequestException('title is required');
    }

    if (!input.prompt.trim()) {
      throw new BadRequestException('prompt is required');
    }

    const uniqueMemberIds = Array.from(new Set((input.members ?? []).filter(Boolean)));
    if (uniqueMemberIds.length === 0) {
      throw new BadRequestException('At least one member is required');
    }

    const adminProfile = await this.fetchUser(adminId);
    if (!this.isAdmin(adminProfile)) {
      throw new ForbiddenException('Only admins can create conversations');
    }

    const memberProfiles = await Promise.all(uniqueMemberIds.map((memberId) => this.fetchUser(memberId)));
    const participants: ConversationParticipant[] = memberProfiles.map((profile) => ({
      userId: this.resolveUserId(profile),
      role: this.resolveRole(profile),
      skills: this.skillsFromRole(this.resolveRole(profile)),
      isActive: true,
      canApproveTasks: false,
      canSendMessages: true,
      joinedAt: new Date(),
    }));

    const conversation = await this.conversationModel.create({
      title: input.title.trim(),
      adminId,
      memberIds: uniqueMemberIds,
      participants,
      status: 'active',
      lastMessageAt: new Date(),
    });

    const aiResult = await this.aiService.decomposeProject({
      prompt: input.prompt.trim(),
      members: participants.map((participant) => ({
        id: participant.userId,
        role: participant.role,
        skills: participant.skills,
      })),
    });

    const proposals = await this.proposalModel.insertMany(
      aiResult.tasks.map((task) => ({
        conversationId: conversation._id.toString(),
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        priority: task.priority,
        status: 'DRAFT' as const,
        createdAt: new Date(),
      })),
    );

    await this.messageModel.create({
      conversationId: conversation._id.toString(),
      senderId: adminId,
      senderType: 'SYSTEM',
      content: 'Conversation created and initial task proposals generated.',
      timestamp: new Date(),
    });

    return {
      conversation: await this.enrichConversation(conversation.toObject()),
      proposals: await this.enrichProposals(proposals.map((proposal) => proposal.toObject())),
      tasks: aiResult.tasks,
    };
  }

  async getConversationsForUser(userId: string) {
    const conversations = await this.conversationModel
      .find({ $or: [{ adminId: userId }, { memberIds: userId }] })
      .sort({ updatedAt: -1 })
      .lean();

    return Promise.all(conversations.map((conversation) => this.enrichConversation(conversation, userId)));
  }

  async getAllConversations() {
    const conversations = await this.conversationModel
      .find()
      .sort({ updatedAt: -1 })
      .lean();

    return Promise.all(conversations.map((conversation) => this.enrichConversation(conversation)));
  }

  async getMessages(conversationId: string) {
    await this.ensureConversationExists(conversationId);
    const messages = await this.messageModel.find({ conversationId }).sort({ timestamp: 1 }).lean();
    return this.enrichMessages(messages);
  }

  async sendMessage(conversationId: string, input: SendMessageDto) {
    await this.ensureConversationAccess(conversationId, input.senderId);

    const message = await this.messageModel.create({
      conversationId,
      senderId: input.senderId,
      senderType: 'USER',
      content: input.content.trim(),
      timestamp: new Date(),
    });

    await this.conversationModel.updateOne({ _id: conversationId }, { $set: { lastMessageAt: new Date() } });
    return this.enrichMessage(message.toObject());
  }

  async runAiDecomposition(conversationId: string, adminId: string) {
    await this.ensureAdminAccess(conversationId, adminId);
    const conversation = await this.ensureConversationExists(conversationId);

    const memberProfiles = await Promise.all(
      conversation.memberIds.map((memberId) => this.fetchUser(memberId)),
    );

    const tasks = await this.aiService.decomposeProject({
      prompt: conversation.title,
      members: memberProfiles.map((profile) => ({
        id: this.resolveUserId(profile),
        role: this.resolveRole(profile),
        skills: this.skillsFromRole(this.resolveRole(profile)),
      })),
    });

    const proposals = await this.proposalModel.insertMany(
      tasks.tasks.map((task) => ({
        conversationId,
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        priority: task.priority,
        status: 'DRAFT' as const,
        createdAt: new Date(),
      })),
    );

    return {
      tasks: tasks.tasks,
      proposals: await this.enrichProposals(proposals.map((proposal) => proposal.toObject())),
    };
  }

  async approveProposal(proposalId: string, adminId: string) {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    await this.ensureAdminAccess(proposal.conversationId, adminId);

    if (proposal.status === 'APPROVED' && proposal.createdTaskId) {
      return {
        proposal: await this.enrichProposal(proposal.toObject()),
      };
    }

    const taskCreationResult = await firstValueFrom(
      this.taskClient.send({ cmd: 'createTasksBatch' }, {
        userId: adminId,
        tasks: [
          {
            title: proposal.title,
            description: proposal.description,
            assignedTo: proposal.assignedTo,
            priority: proposal.priority,
            conversationId: proposal.conversationId,
            proposalId,
            status: 'TODO',
          },
        ],
      }).pipe(
        timeout(5000),
        catchError((error) => {
          throw new ServiceUnavailableException(`Task service unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
        }),
      ),
    );

    const createdTask = Array.isArray(taskCreationResult) ? taskCreationResult[0] : taskCreationResult;

    proposal.status = 'APPROVED';
    proposal.approvedAt = new Date();
    proposal.createdTaskId = createdTask?.id;
    await proposal.save();

    const assignee = this.toUserSummary(await this.fetchUser(proposal.assignedTo));
    const systemMessage = await this.messageModel.create({
      conversationId: proposal.conversationId,
      senderId: adminId,
      senderType: 'SYSTEM',
      content: `Task "${proposal.title}" assigned to @${assignee.fullName}`,
      messageType: 'TASK_ASSIGNED',
      metadata: {
        taskId: createdTask?.id,
        taskTitle: proposal.title,
        assigneeId: proposal.assignedTo,
        assigneeName: assignee.fullName,
      } satisfies StructuredSystemMessage,
      timestamp: new Date(),
    });

    await this.conversationModel.updateOne(
      { _id: proposal.conversationId },
      { $set: { lastMessageAt: new Date() } },
    );

    return {
      proposal: await this.enrichProposal(proposal.toObject()),
      systemMessage: await this.enrichMessage(systemMessage.toObject()),
    };
  }

  async rejectProposal(proposalId: string, adminId: string) {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    await this.ensureAdminAccess(proposal.conversationId, adminId);

    proposal.status = 'REJECTED';
    await proposal.save();
    return this.enrichProposal(proposal.toObject());
  }

  private async ensureConversationExists(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  private async ensureConversationAccess(conversationId: string, userId: string) {
    const conversation = await this.ensureConversationExists(conversationId);
    const allowed = conversation.adminId === userId || conversation.memberIds.includes(userId);
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return conversation;
  }

  private async ensureAdminAccess(conversationId: string, userId: string) {
    const conversation = await this.ensureConversationExists(conversationId);
    if (conversation.adminId !== userId) {
      throw new ForbiddenException('Only the admin can perform this action');
    }

    return conversation;
  }

  private async fetchUser(userId: string): Promise<UserProfile> {
    try {
      const user = await firstValueFrom(
        this.userClient.send({ cmd: 'get_user' }, { userId }).pipe(
          timeout(5000),
          catchError((error) => {
            throw new ServiceUnavailableException(`User service unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
          }),
        ),
      );

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      return user as UserProfile;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw error;
    }
  }

  private resolveUserId(user: UserProfile): string {
    return user.id ?? user._id ?? '';
  }

  private fullName(user: UserProfile): string {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  }

  private toUserSummary(user: UserProfile): UserSummary {
    return {
      id: this.resolveUserId(user),
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      role: this.resolveRole(user),
      fullName: this.fullName(user) || user.email || this.resolveUserId(user),
    };
  }

  private fallbackUserSummary(userId: string): UserSummary {
    return {
      id: userId,
      firstName: '',
      lastName: '',
      role: 'unknown',
      fullName: userId,
    };
  }

  private async fetchUsersByIds(userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const entries = await Promise.all(
      uniqueIds.map(async (userId) => {
        try {
          return [userId, this.toUserSummary(await this.fetchUser(userId))] as const;
        } catch {
          return [userId, this.fallbackUserSummary(userId)] as const;
        }
      }),
    );

    return new Map(entries);
  }

  private async enrichConversation<T extends { _id?: { toString(): string } | string; id?: string; adminId: string; memberIds: string[]; participants?: Array<{ userId: string }> }>(conversation: T, viewerUserId?: string) {
    const userMap = await this.fetchUsersByIds([conversation.adminId, ...(conversation.memberIds ?? [])]);
    const conversationId = conversation.id ?? conversation._id?.toString?.() ?? String(conversation._id ?? '');
    const pendingProposalCount = conversationId
      ? await this.proposalModel.countDocuments({
          conversationId,
          status: 'DRAFT',
        })
      : 0;
    const pendingAssignedProposalCount = conversationId && viewerUserId
      ? await this.proposalModel.countDocuments({
          conversationId,
          status: 'DRAFT',
          assignedTo: viewerUserId,
        })
      : 0;

    return {
      ...conversation,
      admin: userMap.get(conversation.adminId),
      members: (conversation.memberIds ?? []).map((memberId) => userMap.get(memberId)).filter(Boolean),
      pendingProposalCount,
      pendingAssignedProposalCount,
      participants: (conversation.participants ?? []).map((participant) => ({
        ...participant,
        user: userMap.get(participant.userId),
        fullName: userMap.get(participant.userId)?.fullName ?? participant.userId,
      })),
    };
  }

  private async enrichMessages<T extends { senderId: string }>(messages: T[]) {
    const userMap = await this.fetchUsersByIds(messages.map((message) => message.senderId));
    return messages.map((message) => ({
      ...message,
      sender: userMap.get(message.senderId),
    }));
  }

  private async enrichMessage<T extends { senderId: string }>(message: T) {
    const [enriched] = await this.enrichMessages([message]);
    return enriched;
  }

  private async enrichProposals<T extends { assignedTo: string }>(proposals: T[]) {
    const userMap = await this.fetchUsersByIds(proposals.map((proposal) => proposal.assignedTo));
    return proposals.map((proposal) => ({
      ...proposal,
      assignee: userMap.get(proposal.assignedTo),
    }));
  }

  private async enrichProposal<T extends { assignedTo: string }>(proposal: T) {
    const [enriched] = await this.enrichProposals([proposal]);
    return enriched;
  }

  private resolveRole(user: UserProfile): string {
    return (user.role ?? 'employee').toLowerCase();
  }

  private isAdmin(user: UserProfile): boolean {
    return this.resolveRole(user) === 'admin';
  }

  private skillsFromRole(role: string): string[] {
    const normalized = role.toLowerCase();

    if (normalized === 'admin') {
      return ['planning', 'approval', 'coordination'];
    }

    if (normalized === 'manager') {
      return ['planning', 'review', 'delivery'];
    }

    if (normalized === 'developer') {
      return ['implementation', 'debugging', 'integration'];
    }

    if (normalized === 'hr') {
      return ['coordination', 'communication', 'onboarding'];
    }

    if (normalized === 'finance') {
      return ['analysis', 'reporting', 'accuracy'];
    }

    if (normalized === 'marketer') {
      return ['campaigns', 'messaging', 'analytics'];
    }

    if (normalized === 'sales rep') {
      return ['outreach', 'follow-up', 'communication'];
    }

    return ['execution', 'collaboration', 'delivery'];
  }
}

