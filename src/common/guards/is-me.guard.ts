import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from '../../authentication/user/entities/user.entity';
import { Nullable } from '../../types/primitives';

@Injectable()
export class IsMeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request.user || null) as Nullable<UserEntity>;
    const targetedUserId = request.params.id;

    if (!user || (targetedUserId && user.id !== Number(targetedUserId))) {
      throw new ForbiddenException('Not authorized to perform this action.');
    }

    return true;
  }
}
