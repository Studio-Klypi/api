import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import type { Prisma, ContactType } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './entities/contact.entity';
import { ReplyDto } from './dto/reply.dto';

@Injectable()
export class ContactService {
  constructor(private readonly db: DatabaseService) {}

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
    return admin ? contact : new ContactEntity(contact);
  }

  async reply(payload: ReplyDto) {
    if (await this.isProcessed(payload.replyTo))
      throw new ConflictException("Can't reply to already processed message.");
    // TODO: send email - loic
    return this.db.contact.update({
      where: {
        id: payload.replyTo,
        processedAt: null,
      },
      data: {
        processedAt: new Date(),
      },
    });
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
