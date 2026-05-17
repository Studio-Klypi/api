import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  mixin,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from '../../authentication/user/entities/user.entity';
import { Nullable } from '../../types/primitives';
import { AuthGuard } from './auth.guard';
import { UserRole } from '@prisma/client';
import { AdminGuard } from './admin.guard';

export const HasRoleGuard = (...roles: UserRole[]): Type<CanActivate> => {
  @Injectable()
  class HasRoleGuardMixin implements CanActivate {
    private readonly adminGuard = new AdminGuard();

    constructor(private readonly authGuard: AuthGuard) {}

    canActivate(context: ExecutionContext): boolean {
      try {
        this.authGuard.canActivate(context);
      } catch {
        if (this.adminGuard.canActivate(context)) return true;
      }

      const request = context.switchToHttp().getRequest<Request>();
      const user = (request.user || null) as Nullable<UserEntity>;

      if (!user || !roles.includes(user.role)) {
        throw new UnauthorizedException(
          'Not authorized to perform this action.',
        );
      }

      return true;
    }
  }

  return mixin(HasRoleGuardMixin);
};
