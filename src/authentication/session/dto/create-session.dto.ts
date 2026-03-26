import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PASSWORD_REGEX } from '../../../lib/generate';

export class CreateSessionDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX)
  password: string;

  @IsOptional()
  @IsBoolean()
  keep?: boolean;
}
