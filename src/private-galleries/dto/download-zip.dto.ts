import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class DownloadZipItemDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsIn(['original', 'retouch'])
  type: 'original' | 'retouch';
}

export class DownloadZipDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DownloadZipItemDto)
  pictures: DownloadZipItemDto[];
}
