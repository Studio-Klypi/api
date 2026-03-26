import { Nullable } from '../../../types/primitives';
import { Exclude } from 'class-transformer';
import { SessionEntity } from '../../session/entities/session.entity';
import { UserRole } from '@prisma/client';

export class UserEntity {
  id: number;
  key: string;
  avatar: Nullable<string>;
  firstName: string;
  lastName: string;
  email: string;
  @Exclude()
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Nullable<Date>;

  sessions?: SessionEntity[];

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
