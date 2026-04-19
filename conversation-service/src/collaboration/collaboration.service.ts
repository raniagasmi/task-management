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
      conversation,
      proposals,
      tasks: aiResult.tasks,
    };
  }

  async getConversationsForUser(userId: string) {
    return this.conversationModel.find({ $or: [{ adminId: userId }, { memberIds: userId }] }).sort({ updatedAt: -1 }).lean();
  }

  async getMessages(conversationId: string) {
    await this.ensureConversationExists(conversationId);
    return this.messageModel.find({ conversationId }).sort({ timestamp: 1 }).lean();
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
    return message;
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

    return { tasks: tasks.tasks, proposals };
  }

  async approveProposal(proposalId: string, adminId: string) {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    await this.ensureAdminAccess(proposal.conversationId, adminId);

    if (proposal.status === 'APPROVED' && proposal.createdTaskId) {
      return proposal;
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

    return proposal;
  }

  async rejectProposal(proposalId: string, adminId: string) {
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    await this.ensureAdminAccess(proposal.conversationId, adminId);

    proposal.status = 'REJECTED';
    await proposal.save();
    return proposal;
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

