import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import type { File as MulterFile } from 'multer';
import { extname, join } from 'path';
import { RecruitmentService } from './recruitment.service';
import { ApplyCandidateDto } from './dto/apply-candidate.dto';

const CV_UPLOAD_DIRECTORY = join(process.cwd(), 'uploads', 'cvs');

const cvUploadOptions = {
	storage: diskStorage({
		destination: (_request: unknown, _file: MulterFile, callback: (error: Error | null, destination: string) => void) => {
			mkdirSync(CV_UPLOAD_DIRECTORY, { recursive: true });
			callback(null, CV_UPLOAD_DIRECTORY);
		},
		filename: (_request: unknown, file: MulterFile, callback: (error: Error | null, destination: string) => void) => {
			callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
		},
	}),
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
};

@Controller('jobs')
export class JobsController {
	constructor(private readonly recruitmentService: RecruitmentService) {}

	@Get()
	async listPublicJobs() {
		return this.recruitmentService.listPublicJobOffers();
	}

	@Post(':jobOfferId/apply')
	@UseInterceptors(
		FileInterceptor('cv', cvUploadOptions),
	)
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)
	async applyForJob(
		@Param('jobOfferId') jobOfferId: string,
		@Body() body: ApplyCandidateDto,
		@UploadedFile() cv: MulterFile,
	) {
		return this.recruitmentService.applyForJob(jobOfferId, body, cv);
	}
}
