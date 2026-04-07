import { Direction, Period } from '../../types/statistic';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class InteractionQueryDto {
  @IsIn([Period.TODAY, Period.THIS_WEEK, Period.THIS_MONTH, Period.THIS_YEAR], {
    message: 'period must be one of: today, this-week, this-month, this-year',
  })
  period: Period;
}

export class StatisticQueryDto {
  @IsEnum(Period)
  period: Period;

  @ValidateIf((o: StatisticQueryDto) => o.period === Period.CUSTOM)
  @IsDateString()
  @IsNotEmpty()
  start?: Date;

  @ValidateIf((o: StatisticQueryDto) => o.period === Period.CUSTOM)
  @IsDateString()
  @IsNotEmpty()
  end?: Date;

  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
