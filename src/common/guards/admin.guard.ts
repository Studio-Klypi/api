import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers['x-api-key'] === process.env.API_KEY) return true;
    throw new ForbiddenException(
      'Not enough permissions to perform this action.',
    );
  }
}
