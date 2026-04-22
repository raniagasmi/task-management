import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: false })
export class Message {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  senderId!: string;

  @Prop({ required: true, enum: ['USER', 'AI', 'SYSTEM'] })
  senderType!: 'USER' | 'AI' | 'SYSTEM';

  @Prop({ required: true })
  content!: string;

  @Prop({ required: false, enum: ['TEXT', 'TASK_ASSIGNED'], default: 'TEXT' })
  messageType?: 'TEXT' | 'TASK_ASSIGNED';

  @Prop({ type: Object, required: false })
  metadata?: {
    taskId?: string;
    taskTitle?: string;
    assigneeId?: string;
    assigneeName?: string;
  };

  @Prop({ default: Date.now })
  timestamp!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, timestamp: -1 });
