import * as primitives from '../../types/primitives';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  role: primitives.Nullable<string>;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  avatar: primitives.Nullable<string>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(800)
  text: string;
}
