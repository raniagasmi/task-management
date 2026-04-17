import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class GenerateLinkedInPostDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  jobOfferId!: string;
}
