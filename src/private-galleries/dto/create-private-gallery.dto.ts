import { ShootingType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePrivateGalleryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  clientEmails: string[];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  photoQuota?: number;

  @IsDateString()
  @IsNotEmpty()
  shootingDate: Date;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shootingCity?: string;

  @IsEnum(ShootingType)
  @IsNotEmpty()
  shootingType: ShootingType;
}
