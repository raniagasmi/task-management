import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CopilotThreadDocument = CopilotThread & Document;

@Schema({ _id: true })
export class CopilotMessage {
  @Prop({ required: true, enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const CopilotMessageSchema = SchemaFactory.createForClass(CopilotMessage);

@Schema({ collection: 'copilot_threads', timestamps: true })
export class CopilotThread {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  threadId!: string;

  @Prop({ required: true, trim: true, default: 'New recruitment chat' })
  title!: string;

  @Prop({ trim: true, default: '' })
  firstPrompt!: string;

  @Prop({ type: Boolean, default: false })
  isArchived!: boolean;

  @Prop({ type: Boolean, default: false })
  isMuted!: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: [CopilotMessageSchema], default: [] })
  messages!: Types.DocumentArray<CopilotMessage>;
}

export const CopilotThreadSchema = SchemaFactory.createForClass(CopilotThread);
CopilotThreadSchema.index({ userId: 1, threadId: 1 }, { unique: true });

