import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { AiService } from './ai.service';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { Candidate, CandidateSchema } from './schemas/candidate.schema';
import { CopilotThread, CopilotThreadSchema } from './schemas/copilot-thread.schema';
import { JobOffer, JobOfferSchema } from './schemas/job-offer.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: JobOffer.name, schema: JobOfferSchema },
			{ name: CopilotThread.name, schema: CopilotThreadSchema },
			{ name: Candidate.name, schema: CandidateSchema },
			{ name: Application.name, schema: ApplicationSchema },
		]),
	],
	controllers: [RecruitmentController, JobsController],
	providers: [RecruitmentService, AiService],
})
export class RecruitmentModule {}
