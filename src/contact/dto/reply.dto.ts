import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class ReplyDto {
  @IsInt()
  @IsPositive()
  replyTo: number;

  @IsString()
  @IsNotEmpty()
  message: string;
}
