import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { IsAdmin } from '../common/decorators/is-admin.decorator';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import type { Prisma } from '@prisma/client';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly service: TestimonialService) {}

  @Get()
  findAll(
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('offset') offset?: number,
    @IsAdmin() admin?: boolean,
  ) {
    const items = sort?.split(',') ?? [];
    const sorting = items.reduce((acc, item) => {
      const sortOrder = item.startsWith('-') ? 'desc' : 'asc';
      acc = [...acc, { [item.replace('-', '')]: sortOrder }];
      return acc;
    }, [] as Prisma.TestimonialOrderByWithRelationInput[]);

    return this.service.findAll(sorting, search, page, offset, admin);
  }

  @Post()
  store(@Body() body: CreateTestimonialDto, @IsAdmin() admin?: boolean) {
    return this.service.create(body, admin);
  }

  @Patch(':id/accept')
  @UseGuards(new AdminGuard())
  accept(@Param('id', ParseIntPipe) id: number) {
    return this.service.accept(id);
  }

  @Patch(':id/deny')
  @UseGuards(new AdminGuard())
  deny(@Param('id', ParseIntPipe) id: number) {
    return this.service.deny(id);
  }
}
