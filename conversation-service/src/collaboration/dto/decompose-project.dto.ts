import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DecomposeProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsArray()
  @IsString({ each: true })
  skills!: string[];
}

export class DecomposeProjectDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecomposeProjectMemberDto)
  members!: DecomposeProjectMemberDto[];
}
