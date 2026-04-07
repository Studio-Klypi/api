import { DateRange, Period } from '../types/statistic';
import { StatisticQueryDto } from '../statistics/dto/statistic-query.dto';

export function computeDateRange(query: StatisticQueryDto): DateRange {
  const today = new Date();
  const start = new Date(today);

  switch (query.period) {
    case Period.TODAY: {
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }
    case Period.THIS_WEEK: {
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);

      return { start, end: today };
    }
    case Period.THIS_MONTH: {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      return { start, end: today };
    }
    case Period.THIS_YEAR: {
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      return { start, end: today };
    }
    default: {
      return {
        start: query.start ?? start,
        end: query.end ?? today,
      };
    }
  }
}
