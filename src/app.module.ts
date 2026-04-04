import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './common/database/database.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ContactModule } from './contact/contact.module';
import { MailerModule } from './common/mailer/mailer.module';
import { UserModule } from './authentication/user/user.module';
import { SessionModule } from './authentication/session/session.module';
import { UserMiddleware } from './common/middlewares/user.middleware';

@Module({
  imports: [
    MailerModule,
    ProjectModule,
    DatabaseModule,
    TestimonialModule,
    ContactModule,
    UserModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserMiddleware).forRoutes('*');
  }
}
