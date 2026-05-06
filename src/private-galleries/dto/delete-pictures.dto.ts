import type { Listed } from '../../types/primitives';
import { ArrayMinSize, IsArray, IsInt, IsPositive } from 'class-validator';

export class DeletePicturesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  ids: Listed<number>;
}
