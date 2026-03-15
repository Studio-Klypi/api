import { join } from 'path';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './common/database/database.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ContactModule } from './contact/contact.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

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
      },
      defaults: {
        from: `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_FROM_EMAIL}>`,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
