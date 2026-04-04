import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import type { Prisma, ContactType } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './entities/contact.entity';
import { ReplyDto } from './dto/reply.dto';
import { MailerService } from '../common/mailer/mailer.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
  ) {}

  async findAll(
    sort: Prisma.ContactOrderByWithRelationInput[],
    search?: string,
    typeFilter?: ContactType[],
    page: number = 1,
    offset: number = 20,
  ) {
    let where = {};
    if (search && search.length > 0)
      where = {
        ...where,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      };
    if (typeFilter && typeFilter.length > 0)
      where = {
        ...where,
        type: {
          in: typeFilter,
        },
      };

    const total = await this.db.contact.count({ where });
    const contacts = await this.db.contact.findMany({
      where,
      orderBy: sort,
      skip: (page - 1) * offset,
      take: offset,
    });

    return {
      data: contacts,
      meta: {
        total,
        count: contacts.length,
      },
    };
  }

  async create(payload: CreateContactDto, admin?: boolean) {
    const contact = await this.db.contact.create({
      data: payload,
    });
    await this.mailer
      .sendMail({
        to: payload.email,
        subject: 'Nous avons bien recu votre message',
        template: 'contact-confirmation',
        text: `Bonjour ${payload.firstName},\n\nNous avons bien reçu votre message concernant "${payload.subject}".\n\nNotre équipe reviendra vers vous dans les plus brefs délais.\n\nL'équipe Studio Klypi`,
        context: {
          firstName: payload.firstName,
          subject: payload.subject,
          message: payload.message,
          year: new Date().getFullYear(),
        },
      })
      .catch();
    return admin ? contact : new ContactEntity(contact);
  }

  async reply(id: number, payload: ReplyDto) {
    if (await this.isProcessed(id))
      throw new ConflictException("Can't reply to already processed message.");

    const message = await this.db.contact.update({
      where: {
        id,
        processedAt: null,
      },
      data: {
        processedAt: new Date(),
      },
    });
    await this.mailer.sendMail({
      to: message.email,
      subject: `Re: ${message.subject}`,
      replyTo: process.env.MAILER_REPLY_TO,
      template: 'reply-message',
      text: `Bonjour ${message.firstName},\n\n${payload.message}\n\nL'équipe Studio Klypi`,
      context: {
        firstName: message.firstName,
        message: payload.message,
        year: new Date().getFullYear(),
      },
    });

    return message;
  }

  private async isProcessed(id: number): Promise<boolean> {
    return !!(await this.db.contact.findUnique({
      where: {
        id,
        processedAt: {
          not: null,
        },
      },
    }));
  }
}
