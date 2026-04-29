import { IsEnum, IsOptional } from 'class-validator';
import { ApplicationStatus } from '../schemas/application.schema';

export class ListApplicationsQueryDto {
	@IsOptional()
	@IsEnum(ApplicationStatus)
	status?: ApplicationStatus;
}
