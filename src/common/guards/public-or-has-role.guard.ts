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
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';

export const PublicOrHasRoleGuard = (
  ...roles: UserRole[]
): Type<CanActivate> => {
  @Injectable()
  class PublicOrHasRoleGuardMixin implements CanActivate {
    private readonly adminGuard = new AdminGuard();

    constructor(private readonly authGuard: AuthGuard) {}

    canActivate(context: ExecutionContext): boolean {
      try {
        this.authGuard.canActivate(context);
      } catch {
        return true;
      }

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
