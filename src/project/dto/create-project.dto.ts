import * as primitives from '../../types/primitives';
import { Prisma, ProjectStatus, ProjectVisibility } from '@prisma/client';
import {
  IsEnum,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  description: string;

  @IsOptional()
  @IsString()
  banner: primitives.Nullable<string>;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsJSON()
  sections?: Prisma.InputJsonArray;
}
