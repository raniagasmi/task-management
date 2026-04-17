import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateJobOfferDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}
