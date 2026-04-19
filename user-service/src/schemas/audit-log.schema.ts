import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  actorEmail!: string;

  @Prop({ required: true })
  actorRole!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  resource!: string;

  @Prop()
  resourceId?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
