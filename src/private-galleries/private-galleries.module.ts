import { Module } from '@nestjs/common';
import { PrivateGalleriesService } from './private-galleries.service';
import { PrivateGalleriesController } from './private-galleries.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { DatabaseModule } from '../common/database/database.module';

@Module({
  imports: [MailerModule, DatabaseModule],
  controllers: [PrivateGalleriesController],
  providers: [PrivateGalleriesService],
})
export class PrivateGalleriesModule {}
