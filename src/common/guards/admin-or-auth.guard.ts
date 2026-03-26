import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';

@Injectable()
export class AdminOrAuthGuard implements CanActivate {
  private readonly adminGuard = new AdminGuard();

  constructor(private readonly authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await this.authGuard.canActivate(context);
    } catch {
      // Auth check failed, try admin
      console.error('Auth check failed, trying admin');
    }

    try {
      return this.adminGuard.canActivate(context);
    } catch {
      // Both failed
      console.error('Admin check failed, fallback error');
    }

    throw new UnauthorizedException(
      'Not enough permissions to perform this action.',
    );
  }
}
