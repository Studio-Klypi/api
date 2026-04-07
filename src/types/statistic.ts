export enum Period {
  TODAY = 'today',
  THIS_WEEK = 'this-week',
  THIS_MONTH = 'this-month',
  THIS_YEAR = 'this-year',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export enum Direction {
  RECEIVED = 'received',
  PROCESSED = 'processed',
}

export interface DateRange {
  start: Date;
  end: Date;
}
