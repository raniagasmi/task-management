import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class ConversationParticipant {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  canApproveTasks!: boolean;

  @Prop({ default: false })
  canSendMessages!: boolean;

  @Prop({ default: Date.now })
  joinedAt!: Date;
}

export const ConversationParticipantSchema = SchemaFactory.createForClass(ConversationParticipant);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  adminId!: string;

  @Prop({ type: [String], default: [] })
  memberIds!: string[];

  @Prop({ type: [ConversationParticipantSchema], default: [] })
  participants!: ConversationParticipant[];

  @Prop({ default: 'active' })
  status!: string;

  @Prop({ default: Date.now })
  lastMessageAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ adminId: 1 });
ConversationSchema.index({ memberIds: 1 });
