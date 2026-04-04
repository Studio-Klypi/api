import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';

interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  text: string;
  context: Record<string, unknown>;
  replyTo?: string;
}

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST,
      port: Number(process.env.MAILER_PORT || '465'),
      secure: process.env.MAILER_SECURE === 'true',
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    });

    this.registerPartials();
  }

  private registerPartials() {
    const layoutPath = join(__dirname, '..', '..', 'templates', 'layouts', 'main.hbs');
    const layout = readFileSync(layoutPath, 'utf8');
    handlebars.registerPartial('layouts/main', layout);
  }

  private getTemplate(name: string): handlebars.TemplateDelegate {
    if (!this.templates.has(name)) {
      const templatePath = join(__dirname, '..', '..', 'templates', `${name}.hbs`);
      const source = readFileSync(templatePath, 'utf8');
      this.templates.set(name, handlebars.compile(source));
    }
    return this.templates.get(name)!;
  }

  async sendMail(options: SendMailOptions) {
    const template = this.getTemplate(options.template);
    const html = template(options.context);

    return this.transporter.sendMail({
      from: `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_FROM_EMAIL}>`,
      replyTo: options.replyTo || `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_REPLY_TO}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html,
    });
  }
}
