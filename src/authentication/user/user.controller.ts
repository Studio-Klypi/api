import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  ParseIntPipe,
  Param,
  Patch,
  Put,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminOrAuthGuard } from '../../common/guards/admin-or-auth.guard';
import { HasRoleGuard } from '../../common/guards/has-role.guard';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { IsMeOrHasRoleGuard } from '../../common/guards/is-me-or-has-role.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserEntity } from './entities/user.entity';
import { IsMeGuard } from '../../common/guards/is-me.guard';

@Controller('users')
@UseGuards(AdminOrAuthGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  create(@Body() body: CreateUserDto) {
    return this.service.create(body);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.service.findAll(page, offset, search);
  }

  @Patch(':id/send-new-password')
  @UseGuards(HasRoleGuard('superadmin', 'admin'))
  sendNewPassword(@Param('id', ParseIntPipe) id: number) {
    return this.service.sendNewPassword(id);
  }

  @Put(':id')
  @UseGuards(IsMeOrHasRoleGuard('superadmin', 'admin'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @GetUser() me: UserEntity,
  ) {
    return this.service.update(id, body, me);
  }

  @Delete(':id/deactivate')
  @UseGuards(IsMeOrHasRoleGuard('superadmin'))
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  @Post(':id/activate')
  @UseGuards(HasRoleGuard('superadmin'))
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id);
  }

  @Patch(':id/update-password')
  @UseGuards(IsMeGuard)
  patchPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserPasswordDto,
  ) {
    return this.service.patchPassword(id, body);
  }
}
