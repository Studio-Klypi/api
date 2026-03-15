import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { TestimonialEntity } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { type Prisma } from '@prisma/client';

@Injectable()
export class TestimonialService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(
    sorting: Prisma.TestimonialOrderByWithRelationInput[],
    search?: string,
    page: number = 1,
    offset: number = 20,
    admin?: boolean,
  ) {
    let where = {};
    if (search && search.length > 0)
      where = {
        ...where,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    if (!admin) where = { ...where, verifiedAt: { not: null } };

    const total = await this.db.testimonial.count({
      where,
    });
    const testimonials = await this.db.testimonial.findMany({
      where,
      orderBy: sorting,
      skip: (page - 1) * offset,
      take: offset,
    });

    return {
      data: admin
        ? testimonials
        : testimonials.map((t) => new TestimonialEntity(t)),
      meta: {
        total,
        count: testimonials.length,
      },
    };
  }

  async create(payload: CreateTestimonialDto, admin?: boolean) {
    const testimonial = await this.db.testimonial.create({
      data: payload,
    });

    return admin ? testimonial : new TestimonialEntity(testimonial);
  }

  async accept(id: number) {
    const isProcessed = !!(await this.db.testimonial.findUnique({
      where: {
        id,
        processedAt: {
          not: null,
        },
      },
    }));
    const now = new Date();

    return this.db.testimonial.update({
      where: {
        id,
      },
      data: {
        verifiedAt: now,
        ...(isProcessed ? {} : { processedAt: now }),
      },
    });
  }

  async deny(id: number) {
    const isProcessed = !!(await this.db.testimonial.findUnique({
      where: {
        id,
        processedAt: {
          not: null,
        },
      },
    }));
    const now = new Date();

    return this.db.testimonial.update({
      where: {
        id,
      },
      data: {
        verifiedAt: null,
        ...(isProcessed ? {} : { processedAt: now }),
      },
    });
  }
}
