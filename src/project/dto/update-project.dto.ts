import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import * as primitives from '../../types/primitives';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsDate()
  archivedAt?: primitives.Nullable<Date>;
}
