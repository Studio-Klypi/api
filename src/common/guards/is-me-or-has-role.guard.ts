import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { lastValueFrom, isObservable } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { UserRole } from '@prisma/client';
import { IsMeGuard } from './is-me.guard';
import { HasRoleGuard } from './has-role.guard';

export const IsMeOrHasRoleGuard = (...roles: UserRole[]): Type<CanActivate> => {
  const RoleGuard = HasRoleGuard(...roles);

  @Injectable()
  class IsMeOrHasRoleGuardMixin implements CanActivate {
    private readonly isMeGuard = new IsMeGuard();
    private readonly roleGuard: InstanceType<typeof RoleGuard>;

    constructor(authGuard: AuthGuard) {
      this.roleGuard = new RoleGuard(authGuard);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      try {
        return this.isMeGuard.canActivate(context);
      } catch {
        // Not the target user, fallback to role check
      }

      const result = this.roleGuard.canActivate(context);
      return isObservable(result) ? await lastValueFrom(result) : await result;
    }
  }

  return mixin(IsMeOrHasRoleGuardMixin);
};
