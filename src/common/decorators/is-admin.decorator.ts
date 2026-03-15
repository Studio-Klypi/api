import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IsAdmin = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-api-key'] === process.env.API_KEY;
  },
);
