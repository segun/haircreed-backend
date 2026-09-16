import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';

export const READ_ROLES = 'readRoles';
export const ReadRoles = (...roles: string[]) => SetMetadata(READ_ROLES, roles);

@Injectable()
export class ReadAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        message: 'A valid bearer session is required',
        code: 'AUTHENTICATION_REQUIRED',
        fieldErrors: {},
      });
    }

    const principal = await this.authService.verifySession(token);
    if (!principal) {
      throw new UnauthorizedException({
        message: 'The bearer session is invalid or expired',
        code: 'INVALID_SESSION',
        fieldErrors: {},
      });
    }

    const roles = this.reflector.getAllAndOverride<string[]>(READ_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]) || [];
    if (roles.length > 0 && !roles.includes(principal.role)) {
      throw new ForbiddenException({
        message: 'The authenticated user does not have access to this resource',
        code: 'INSUFFICIENT_ROLE',
        fieldErrors: {},
      });
    }

    request.user = principal;
    return true;
  }
}