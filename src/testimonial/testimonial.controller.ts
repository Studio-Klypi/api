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
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { compileSort } from '../lib/sort';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { Nullable } from '../types/primitives';
import { UserEntity } from '../authentication/user/entities/user.entity';
import { UserRole } from '@prisma/client';
import { HasRoleGuard } from '../common/guards/has-role.guard';
import { IsAdmin } from '../common/decorators/is-admin.decorator';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly service: TestimonialService) {}

  @Get()
  findAll(
    @GetUser() me: Nullable<UserEntity>,
    @IsAdmin() admin: boolean,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.service.findAll(
      compileSort(sort ?? ''),
      search,
      page,
      offset,
      !!me || admin,
    );
  }

  @Post()
  store(
    @Body() body: CreateTestimonialDto,
    @GetUser() me: Nullable<UserEntity>,
  ) {
    return this.service.create(
      body,
      me ? (['superadmin', 'admin'] as UserRole[]).includes(me?.role) : false,
    );
  }

  @Patch(':id/accept')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  accept(@Param('id', ParseIntPipe) id: number) {
    return this.service.accept(id);
  }

  @Patch(':id/deny')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  deny(@Param('id', ParseIntPipe) id: number) {
    return this.service.deny(id);
  }
}
