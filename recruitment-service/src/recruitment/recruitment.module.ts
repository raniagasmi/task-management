import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { CopilotThread, CopilotThreadSchema } from './schemas/copilot-thread.schema';
import { JobOffer, JobOfferSchema } from './schemas/job-offer.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: JobOffer.name, schema: JobOfferSchema },
			{ name: CopilotThread.name, schema: CopilotThreadSchema },
		]),
	],
	controllers: [RecruitmentController],
	providers: [RecruitmentService, AiService],
})
export class RecruitmentModule {}
