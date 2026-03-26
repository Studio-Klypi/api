import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '../../../lib/generate';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX)
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX)
  newPassword: string;
}
