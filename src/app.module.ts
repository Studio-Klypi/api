import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './common/database/database.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [ProjectModule, DatabaseModule, TestimonialModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
