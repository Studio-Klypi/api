import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdminOrAuthGuard } from '../../common/guards/admin-or-auth.guard';

@Module({
  imports: [DatabaseModule, MailerModule],
  controllers: [UserController],
  providers: [UserService, AuthGuard, AdminOrAuthGuard],
})
export class UserModule {}
