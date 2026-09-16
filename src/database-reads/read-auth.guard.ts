import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const READ_ROLES = 'readRoles';
export const ReadRoles = (...roles: string[]) => SetMetadata(READ_ROLES, roles);

@Injectable()
export class ReadAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException({
        message: 'Authentication is required',
        code: 'AUTHENTICATION_REQUIRED',
        fieldErrors: {},
      });
    }
    const roles = this.reflector.getAllAndOverride<string[]>(READ_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]) || [];
    if (roles.length > 0 && !roles.includes(request.user.role)) {
      throw new ForbiddenException({
        message: 'The authenticated user does not have access to this resource',
        code: 'INSUFFICIENT_ROLE',
        fieldErrors: {},
      });
    }

    return true;
  }
}