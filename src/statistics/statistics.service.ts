import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DatabaseService } from '../common/database/database.service';
import {
  InteractionQueryDto,
  StatisticQueryDto,
} from './dto/statistic-query.dto';
import { computeDateRange } from '../lib/dates';
import { Direction, Period } from '../types/statistic';

const PERIOD_TO_SQL_EXTRACT: Record<string, string> = {
  [Period.TODAY]: 'HOUR',
  [Period.THIS_WEEK]: 'ISODOW',
  [Period.THIS_MONTH]: 'DAY',
  [Period.THIS_YEAR]: 'MONTH',
};

const SLOT_COUNTS: Record<string, number> = {
  [Period.TODAY]: 24,
  [Period.THIS_WEEK]: 7,
  [Period.THIS_MONTH]: new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate(),
  [Period.THIS_YEAR]: 12,
};

const WEEK_LABELS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];
const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

@Injectable()
export class StatisticsService {
  constructor(
    private readonly mailer: MailerService,
    private readonly db: DatabaseService,
  ) {}

  async getMessages(query: StatisticQueryDto) {
    console.log(query);
    const range = computeDateRange(query);

    try {
      return await this.db.contact.count({
        where: {
          ...(query.direction === Direction.PROCESSED
            ? {
                processedAt: {
                  gte: range.start,
                  lte: range.end,
                },
              }
            : {
                createdAt: {
                  gte: range.start,
                  lte: range.end,
                },
              }),
        },
      });
    } catch {
      return new InternalServerErrorException();
    }
  }

  async getTestimonials(query: StatisticQueryDto) {
    console.log(query);
    const range = computeDateRange(query);

    try {
      return await this.db.testimonial.count({
        where: {
          ...(query.direction === Direction.PROCESSED
            ? {
                processedAt: {
                  gte: range.start,
                  lte: range.end,
                },
              }
            : {
                createdAt: {
                  gte: range.start,
                  lte: range.end,
                },
              }),
        },
      });
    } catch {
      return new InternalServerErrorException();
    }
  }

  async getInteractions(query: InteractionQueryDto) {
    const range = computeDateRange(query);
    const extract = PERIOD_TO_SQL_EXTRACT[query.period];

    try {
      const rows = await this.db.$queryRawUnsafe<
        { slot: number; category: string; count: number }[]
      >(
        `SELECT slot, category, COUNT(*)::int AS count FROM (
           SELECT EXTRACT(${extract} FROM "createdAt")::int AS slot, 'messagesReceived' AS category
           FROM contacts WHERE "createdAt" BETWEEN $1 AND $2
           UNION ALL
           SELECT EXTRACT(${extract} FROM "processedAt")::int AS slot, 'messagesProcessed' AS category
           FROM contacts WHERE "processedAt" BETWEEN $1 AND $2
           UNION ALL
           SELECT EXTRACT(${extract} FROM "createdAt")::int AS slot, 'testimonialsReceived' AS category
           FROM testimonials WHERE "createdAt" BETWEEN $1 AND $2
           UNION ALL
           SELECT EXTRACT(${extract} FROM "processedAt")::int AS slot, 'testimonialsProcessed' AS category
           FROM testimonials WHERE "processedAt" BETWEEN $1 AND $2
         ) combined
         GROUP BY slot, category
         ORDER BY slot`,
        range.start,
        range.end,
      );

      return this.fillGapsByCategory(rows, query.period);
    } catch {
      throw new InternalServerErrorException();
    }
  }

  private fillGapsByCategory(
    rows: { slot: number; category: string; count: number }[],
    period: Period,
  ) {
    const categories = [
      'messagesReceived',
      'messagesProcessed',
      'testimonialsReceived',
      'testimonialsProcessed',
    ];
    const slotCount = SLOT_COUNTS[period];
    const startIndex = period === Period.TODAY ? 0 : 1;

    const countMap = new Map<string, number>();
    for (const row of rows) {
      countMap.set(`${row.category}:${row.slot}`, row.count);
    }

    const labels = Array.from({ length: slotCount }, (_, i) => {
      const slot = startIndex + i;
      switch (period) {
        case Period.TODAY:
          return `${slot}h`;
        case Period.THIS_WEEK:
          return WEEK_LABELS[i];
        case Period.THIS_YEAR:
          return MONTH_LABELS[i];
        default:
          return `${slot}`;
      }
    });

    return {
      labels,
      series: Object.fromEntries(
        categories.map((cat) => [
          cat,
          Array.from(
            { length: slotCount },
            (_, i) => countMap.get(`${cat}:${startIndex + i}`) ?? 0,
          ),
        ]),
      ),
    };
  }
}
