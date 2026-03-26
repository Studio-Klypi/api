import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Session } from '@prisma/client';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { type Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IsMeGuard } from '../../common/guards/is-me.guard';
import { GetSession } from '../../common/decorators/get-session.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserEntity } from '../user/entities/user.entity';

@Controller('auth')
export class SessionController {
  constructor(private readonly service: SessionService) {}

  @Post('login')
  login(
    @Body() body: CreateSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.login(body, res);
  }

  @Delete('logout')
  @UseGuards(AuthGuard, IsMeGuard)
  logout(
    @GetSession() session: Session,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.kill(session.sid, session.userId, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  recover(@GetUser() user: UserEntity) {
    return user;
  }
}
