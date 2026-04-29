import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'candidates', timestamps: true })
export class Candidate {
	@Prop({ required: true, trim: true })
	name!: string;

	@Prop({ required: true, trim: true, lowercase: true, index: true })
	email!: string;

	@Prop({ type: Date, default: Date.now })
	createdAt!: Date;
}

export type CandidateDocument = Candidate & Document;
export const CandidateSchema = SchemaFactory.createForClass(Candidate);
