import { Injectable } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { DatabaseService } from '../../common/database/database.service';
import { verify } from 'argon2';
import { UserEntity } from '../user/entities/user.entity';
import { type Response } from 'express';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  async login(data: CreateSessionDto, res: Response) {
    const user = await this.db.user.findUnique({
      where: {
        email: data.email,
        deletedAt: null,
      },
    });
    if (!user) throw new Error('User not found.');

    if (!(await verify(user.passwordHash, data.password)))
      throw new Error('Invalid password.');

    const session = await this.create(user.id, data.keep);

    res.cookie(
      process.env.BACKOFFICE_SESSION_COOKIE_NAME as string,
      session!.sid,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * (data.keep ? 24 * 14 : 2),
      },
    );

    return new UserEntity(user);
  }

  private async create(userId: number, keep?: boolean) {
    const duration = 1000 * 60 * 60 * (keep ? 24 * 14 : 2);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration);

    try {
      return await this.db.session.create({
        data: {
          userId,
          issuedAt: now,
          expiresAt,
        },
      });
    } catch {
      // todo
    }
  }

  async kill(sid: string, userId: number, res: Response) {
    try {
      await this.db.session.update({
        where: {
          sid,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      res.clearCookie(process.env.BACKOFFICE_SESSION_COOKIE_NAME as string, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });

      return;
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;

      switch (error.code) {
        case 'P2025': {
          throw new Error(
            'No active session found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new Error('Something went wrong while killing session.');
        }
      }
    }
  }
}
