import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { UserEntity } from '../../authentication/user/entities/user.entity';
import { Nullable } from '../../types/primitives';

export const PublicOrHasRoleGuard = (
  ...roles: UserRole[]
): Type<CanActivate> => {
  @Injectable()
  class PublicOrHasRoleGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();
      const user = (request.user ?? null) as Nullable<UserEntity>;

      if (!user) return true;

      if (!roles.includes(user.role))
        throw new ForbiddenException('Not authorized to perform this action.');

      return true;
    }
  }

  return mixin(PublicOrHasRoleGuardMixin);
};
