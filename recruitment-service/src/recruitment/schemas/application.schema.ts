import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ApplicationStatus {
	Applied = 'Applied',
	Interview = 'Interview',
	Accepted = 'Accepted',
	Rejected = 'Rejected',
}

@Schema({ _id: false })
export class StoredCv {
	@Prop({ required: true, trim: true })
	originalName!: string;

	@Prop({ required: true, trim: true })
	storedName!: string;

	@Prop({ required: true, trim: true })
	path!: string;

	@Prop({ required: true, trim: true })
	mimeType!: string;

	@Prop({ required: true })
	size!: number;
}

export const StoredCvSchema = SchemaFactory.createForClass(StoredCv);

@Schema({ _id: false })
export class AtsAnalysis {
	@Prop({ required: true, min: 0, max: 100 })
	score!: number;

	@Prop({ type: [String], default: [] })
	skills!: string[];

	@Prop({ required: true, trim: true, default: '' })
	experienceSummary!: string;

	@Prop({ type: [String], default: [] })
	missingSkills!: string[];

	@Prop({ type: Date, default: Date.now })
	analyzedAt!: Date;
}

export const AtsAnalysisSchema = SchemaFactory.createForClass(AtsAnalysis);

@Schema({ collection: 'applications', timestamps: true })
export class Application {
	@Prop({ type: Types.ObjectId, ref: 'Candidate', required: true, index: true })
	candidateId!: Types.ObjectId;

	@Prop({ type: Types.ObjectId, ref: 'JobOffer', required: true, index: true })
	jobOfferId!: Types.ObjectId;

	@Prop({ required: true, enum: ApplicationStatus, default: ApplicationStatus.Applied })
	status!: ApplicationStatus;

	@Prop({ required: true, trim: true, unique: true, index: true })
	trackingToken!: string;

	@Prop({ type: StoredCvSchema, required: true })
	cv!: StoredCv;

	@Prop({ type: AtsAnalysisSchema, required: true })
	ats!: AtsAnalysis;

	@Prop({ type: Date, default: Date.now })
	createdAt!: Date;
}

export type ApplicationDocument = Application & Document;
export const ApplicationSchema = SchemaFactory.createForClass(Application);
