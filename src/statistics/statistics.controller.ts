import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import {
  InteractionQueryDto,
  StatisticQueryDto,
} from './dto/statistic-query.dto';
import { AdminOrAuthGuard } from '../common/guards/admin-or-auth.guard';

@Controller('statistics')
@UseGuards(AdminOrAuthGuard)
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get('interactions')
  getInteractions(@Query() query: InteractionQueryDto) {
    return this.service.getInteractions(query);
  }

  @Get('messages')
  getMessages(@Query() query: StatisticQueryDto) {
    return this.service.getMessages(query);
  }

  @Get('testimonials')
  getTestimonials(@Query() query: StatisticQueryDto) {
    return this.service.getTestimonials(query);
  }
}
