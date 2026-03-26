import * as primitives from '../../../types/primitives';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { PASSWORD_REGEX } from '../../../lib/generate';

export class CreateUserDto {
  @IsOptional()
  @IsUrl()
  avatar: primitives.Nullable<string>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(UserRole)
  role?: UserRole;
}
