import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { DatabaseService } from '../../common/database/database.service';
import { hash, verify } from 'argon2';
import type { Prisma } from '@prisma/client';
import { generatePassword } from '../../lib/generate';
import { UserEntity } from './entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { Nullable } from '../../types/primitives';

@Injectable()
export class UserService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailer: MailerService,
  ) {}

  async create(payload: CreateUserDto) {
    const password = generatePassword();
    const passwordHash = await hash(password);

    try {
      const user = await this.db.user.create({
        data: {
          ...payload,
          passwordHash,
        },
      });

      await this.mailer
        .sendMail({
          to: payload.email,
          subject: 'Votre compte a été créé !',
          template: 'welcome-user',
          text: `Bonjour ${payload.firstName},\n\nVotre compte ${process.env.BACKOFFICE_NAME} a été créé.\n\nEmail : ${user.email}\nMot de passe : ${password}\n\nConnectez-vous sur ${process.env.BACKOFFICE_AUTH_URL}\n\nL'équipe Studio Klypi`,
          context: {
            firstName: payload.firstName,
            email: user.email,
            password,
            backofficeName: process.env.BACKOFFICE_NAME,
            backofficeUrl: process.env.BACKOFFICE_URL,
            backofficeAuthUrl: process.env.BACKOFFICE_AUTH_URL,
            year: new Date().getFullYear(),
          },
        })
        .catch();

      return new UserEntity(user);
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;

      switch (error.code) {
        case 'P2002': {
          throw new ConflictException(`Email already in use. ${payload.email}`);
        }
        default: {
          throw new InternalServerErrorException(
            'Something went wrong while creating user.',
          );
        }
      }
    }
  }

  async findAll(page: number = 1, offset: number = 20, search?: string) {
    let where = {};
    if (search && search.length > 0)
      where = {
        ...where,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { role: { contains: search, mode: 'insensitive' } },
        ],
      };

    try {
      const total = await this.db.user.count({ where });
      const users = await this.db.user.findMany({
        where,
        skip: (page - 1) * offset,
        take: offset,
      });

      return {
        data: users.map((user) => new UserEntity(user)),
        meta: {
          total,
          count: users.length,
        },
      };
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async sendNewPassword(id: number) {
    const password = generatePassword();
    const passwordHash = await hash(password);

    try {
      const user = await this.db.user.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          passwordHash,
        },
      });

      await this.mailer.sendMail({
        to: user.email,
        subject: 'Mot de passe mis à jour',
        template: 'reset-password',
        text: `Bonjour ${user.firstName},\n\nUn administrateur a généré un nouveau mot de passe pour votre compte ${process.env.BACKOFFICE_NAME}.\n\nEmail : ${user.email}\nNouveau mot de passe : ${password}\n\n1. Connectez-vous sur ${process.env.BACKOFFICE_AUTH_URL}\n2. Rendez-vous sur votre profil pour modifier votre mot de passe.\n3. Choisissez un nouveau mot de passe personnel et sécurisé.\n\nL'équipe Studio Klypi`,
        context: {
          firstName: user.firstName,
          email: user.email,
          password,
          backofficeName: process.env.BACKOFFICE_NAME,
          backofficeAuthUrl: process.env.BACKOFFICE_AUTH_URL,
          year: new Date().getFullYear(),
        },
      });

      return new UserEntity(user);
    } catch (e) {
      console.error(e);
      const error = e as Prisma.PrismaClientKnownRequestError;

      switch (error.code) {
        case 'P2025': {
          throw new NotFoundException(
            'No active user found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  async update(id: number, payload: UpdateUserDto, me: Nullable<UserEntity>) {
    if (!(await this.exists(id)))
      throw new NotFoundException('User not found.');

    if (payload.role === 'superadmin' && me && me?.role !== 'superadmin')
      throw new ForbiddenException('Not enough permissions to promote.');

    try {
      const user = await this.db.user.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          ...payload,
        },
      });
      return new UserEntity(user);
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2002': {
          throw new ConflictException(`Email already in use. ${payload.email}`);
        }
        case 'P2025': {
          throw new NotFoundException(
            'No active user found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  async patchPassword(id: number, payload: UpdateUserPasswordDto) {
    try {
      const user = await this.db.user.findUnique({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }
      if (!(await verify(user.passwordHash, payload.oldPassword))) {
        throw new ForbiddenException('Old password is incorrect.');
      }

      const passwordHash = await hash(payload.newPassword);

      const updatedUser = await this.db.user.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          passwordHash,
        },
      });

      return new UserEntity(updatedUser);
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;

      switch (error.code) {
        case 'P2025': {
          throw new NotFoundException(
            'No active user found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  async deactivate(id: number) {
    if (!(await this.exists(id)))
      throw new NotFoundException('User not found.');

    try {
      const user = await this.db.user.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await this.mailer.sendMail({
        to: user.email,
        subject: 'Votre compte a été désactivé',
        template: 'account-deactivated',
        text: `Bonjour ${user.firstName},\n\nVotre compte ${process.env.BACKOFFICE_NAME} a été désactivé.\n\nSi vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.\n\nL'équipe Studio Klypi`,
        context: {
          firstName: user.firstName,
          backofficeName: process.env.BACKOFFICE_NAME,
          year: new Date().getFullYear(),
        },
      });

      return new UserEntity(user);
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025': {
          throw new NotFoundException(
            'No active user found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  async activate(id: number) {
    try {
      const user = await this.db.user.update({
        where: {
          id,
          deletedAt: {
            not: null,
          },
        },
        data: {
          deletedAt: null,
        },
      });

      await this.mailer.sendMail({
        to: user.email,
        subject: 'Votre compte a été réactivé',
        template: 'account-reactivated',
        text: `Bonjour ${user.firstName},\n\nVotre compte ${process.env.BACKOFFICE_NAME} a été réactivé. Vous pouvez à nouveau vous connecter.\n\nL'équipe Studio Klypi`,
        context: {
          firstName: user.firstName,
          backofficeName: process.env.BACKOFFICE_NAME,
          year: new Date().getFullYear(),
        },
      });

      return new UserEntity(user);
    } catch (e) {
      const error = e as Prisma.PrismaClientKnownRequestError;
      switch (error.code) {
        case 'P2025': {
          throw new NotFoundException(
            'No inactive user found. Might be deleted or is not found.',
          );
        }
        default: {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  private async exists(id: number): Promise<boolean> {
    return !!(await this.db.user.findUnique({
      where: { id, deletedAt: null },
    }));
  }
}
