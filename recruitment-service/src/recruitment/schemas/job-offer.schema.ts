import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'job_offers' })
export class JobOffer {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  responsibilities!: string[];

  @Prop({ type: [String], default: [] })
  requiredSkills!: string[];

  @Prop({ type: [String], default: [] })
  niceToHave!: string[];

  @Prop({ required: true, trim: true })
  seniorityLevel!: string;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export type JobOfferDocument = JobOffer & Document;
export const JobOfferSchema = SchemaFactory.createForClass(JobOffer);
