import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../database/database.service';
import { UserEntity } from '../../authentication/user/entities/user.entity';

@Injectable()
export class UserMiddleware implements NestMiddleware {
  constructor(private readonly db: DatabaseService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const sid = req.cookies?.[
      process.env.BACKOFFICE_SESSION_COOKIE_NAME as string
    ] as string | undefined;

    if (sid) {
      try {
        const session = await this.db.session.findUniqueOrThrow({
          where: {
            sid,
            expiresAt: { gt: new Date() },
            revokedAt: null,
          },
          include: { user: true },
        });

        req.session = session;
        req.user = new UserEntity(session.user);
      } catch {
        // Invalid or expired session — continue without user
      }
    }

    next();
  }
}
