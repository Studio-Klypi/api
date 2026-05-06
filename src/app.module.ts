import { join } from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './common/database/database.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ContactModule } from './contact/contact.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { UserModule } from './authentication/user/user.module';
import { SessionModule } from './authentication/session/session.module';
import { UserMiddleware } from './common/middlewares/user.middleware';
import { StatisticsModule } from './statistics/statistics.module';
import { StorageModule } from './common/storage/storage.module';
import { PrivateGalleriesModule } from './private-galleries/private-galleries.module';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAILER_HOST,
        port: Number(process.env.MAILER_PORT || '465'),
        secure: process.env.MAILER_SECURE === 'true',
        auth: {
          user: process.env.MAILER_USER,
          pass: process.env.MAILER_PASS,
        },
        logger: process.env.ENVIRONMENT === 'development',
        debug: process.env.ENVIRONMENT === 'development',
      },
      defaults: {
        from: `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_FROM_EMAIL}>`,
        replyTo: `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_REPLY_TO}>`,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(undefined, {
          inlineCssEnabled: false,
        }),
        options: {
          strict: true,
        },
      },
      options: {
        partials: {
          dir: join(__dirname, 'templates'),
        },
      },
    }),
    ProjectModule,
    DatabaseModule,
    TestimonialModule,
    ContactModule,
    UserModule,
    SessionModule,
    StatisticsModule,
    StorageModule,
    PrivateGalleriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserMiddleware).forRoutes('*');
  }
}
