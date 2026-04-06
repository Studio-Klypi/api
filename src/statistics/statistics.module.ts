import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { DatabaseModule } from '../common/database/database.module';

@Module({
  imports: [MailerModule, DatabaseModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
