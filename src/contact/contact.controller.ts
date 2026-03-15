import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { compileSort } from '../lib/sort';
import { ContactType } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { IsAdmin } from '../common/decorators/is-admin.decorator';
import { ReplyDto } from './dto/reply.dto';
import { compileFilter } from '../lib/filter';

@Controller('contact/messages')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Get()
  @UseGuards(new AdminGuard())
  async findAll(
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('typeFilter') typeFilter?: string,
    @Query('page') page?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(
      compileSort(sort ?? ''),
      search,
      compileFilter<ContactType>(typeFilter ?? ''),
      page,
      offset,
    );
  }

  @Post()
  async create(@Body() body: CreateContactDto, @IsAdmin() admin: boolean) {
    return this.service.create(body, admin);
  }

  @Post('reply')
  @UseGuards(new AdminGuard())
  async reply(@Body() body: ReplyDto) {
    return this.service.reply(body);
  }
}
