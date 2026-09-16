import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const principal = request.user;
    if (!principal) {
      throw new UnauthorizedException("Authentication is required");
    }
    if (principal.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("SUPER_ADMIN role is required");
    }
    if (request.body?.userId && request.body.userId !== principal.id) {
      throw new ForbiddenException(
        "The requested actor does not match the authenticated user",
      );
    }
    return true;
  }
}
