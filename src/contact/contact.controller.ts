import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { compileSort } from '../lib/sort';
import { ContactType } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { IsAdmin } from '../common/decorators/is-admin.decorator';
import { ReplyDto } from './dto/reply.dto';
import { compileFilter } from '../lib/filter';
import { HasRoleGuard } from '../common/guards/has-role.guard';

@Controller('contact/messages')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Get()
  @UseGuards(HasRoleGuard('superadmin', 'admin', 'frontline'))
  async findAll(
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('typeFilter') typeFilter?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
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

  @Post(':id/reply')
  @UseGuards(HasRoleGuard('superadmin', 'admin', 'frontline'))
  async reply(@Param('id', ParseIntPipe) id: number, @Body() body: ReplyDto) {
    return this.service.reply(id, body);
  }
}
