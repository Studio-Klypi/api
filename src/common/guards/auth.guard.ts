import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { UserEntity } from '../../authentication/user/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sid = request.cookies?.[
      process.env.BACKOFFICE_SESSION_COOKIE_NAME as string
    ] as string | undefined;
    if (!sid) {
      throw new UnauthorizedException('Missing or invalid session.');
    }

    const session = await this.db.session.findUniqueOrThrow({
      where: {
        sid,
        expiresAt: {
          gt: new Date(),
        },
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });
    const user = new UserEntity(session.user);

    request.session = session;
    request.user = user;

    return true;
  }
}
