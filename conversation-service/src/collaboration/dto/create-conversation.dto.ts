export interface CreateConversationDto {
  title: string;
  members: string[];
  prompt: string;
  adminId?: string;
}

export interface SendMessageDto {
  senderId: string;
  content: string;
}

export interface ApproveProposalDto {
  adminId: string;
}
