import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CollaborationProposalResponse,
  CollaborationService,
  ConversationCreatedResponse,
} from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  @Post('conversations')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createConversation(@Body() body: { title: string; members: string[]; prompt: string }, @Req() req: { user: { userId?: string } }) {
    const response = await this.collaborationService.createConversation({
      ...body,
      adminId: req.user?.userId,
    }) as ConversationCreatedResponse;

    const conversationId = response?.conversation?._id?.toString?.() ?? response?.conversation?.id?.toString?.() ?? '';
    if (!conversationId) {
      return response;
    }
    const userIds = Array.from(new Set([...(body.members ?? []), req.user?.userId ?? ''].filter(Boolean)));
    this.collaborationGateway.emitConversationNew({ conversationId, userIds, ...response });
    this.collaborationGateway.emitAiGeneratedTasks({ conversationId, ...response });
    this.collaborationGateway.emitProposalUpdates({ conversationId, ...response });

    return response;
  }

  @Get('conversations/user/:userId')
  async getConversationsForUser(@Param('userId') userId: string) {
    return this.collaborationService.getConversationsForUser(userId);
  }

  @Get('conversations')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllConversations() {
    return this.collaborationService.getAllConversations();
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.collaborationService.getMessages(id);
  }

  @Post('conversations/:id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: { senderId: string; content: string }) {
    const message = await this.collaborationService.sendMessage(id, body);
    this.collaborationGateway.emitMessageNew({ conversationId: id, message });
    return message;
  }

  @Post('conversations/:id/ai-decompose')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async decompose(@Param('id') id: string, @Req() req: { user: { userId?: string } }) {
    const response = await this.collaborationService.runAiDecomposition(id, {
      adminId: req.user?.userId ?? '',
    });
    this.collaborationGateway.emitAiGeneratedTasks({ conversationId: id, ...response });
    this.collaborationGateway.emitProposalUpdates({ conversationId: id, ...response });
    return response;
  }

  @Post('proposals/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async approve(@Param('id') id: string, @Req() req: { user: { userId?: string } }) {
    const response = await this.collaborationService.approveProposal(id, {
      adminId: req.user?.userId ?? '',
    }) as CollaborationProposalResponse;
    const proposal = response.proposal;
    if (!proposal) {
      return response;
    }
    this.collaborationGateway.emitProposalApproved({ conversationId: proposal.conversationId, proposal });
    this.collaborationGateway.emitTaskCreated({ conversationId: proposal.conversationId, proposal });
    this.collaborationGateway.emitTaskAssignedNotification({ assignedTo: proposal.assignedTo, proposal });
    if (response.systemMessage) {
      this.collaborationGateway.emitMessageNew({
        conversationId: proposal.conversationId,
        message: response.systemMessage,
      });
    }
    return response;
  }

  @Post('proposals/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reject(@Param('id') id: string, @Req() req: { user: { userId?: string } }) {
    const proposal = await this.collaborationService.rejectProposal(id, {
      adminId: req.user?.userId ?? '',
    }) as CollaborationProposalResponse;
    const conversationId = proposal.proposal?.conversationId ?? proposal.conversationId;
    if (!conversationId) {
      return proposal;
    }
    this.collaborationGateway.emitProposalUpdates({ conversationId, proposal });
    return proposal;
  }
}
