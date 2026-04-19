import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaskProposalDocument = HydratedDocument<TaskProposal>;

@Schema({ timestamps: false })
export class TaskProposal {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, type: String })
  description!: string;

  @Prop({ required: true })
  assignedTo!: string;

  @Prop({ required: true, enum: ['LOW', 'MEDIUM', 'HIGH'] })
  priority!: 'LOW' | 'MEDIUM' | 'HIGH';

  @Prop({ required: true, enum: ['DRAFT', 'APPROVED', 'REJECTED'] })
  status!: 'DRAFT' | 'APPROVED' | 'REJECTED';

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ required: false })
  approvedAt?: Date;

  @Prop({ required: false })
  createdTaskId?: string;
}

export const TaskProposalSchema = SchemaFactory.createForClass(TaskProposal);
TaskProposalSchema.index({ conversationId: 1, assignedTo: 1 });
