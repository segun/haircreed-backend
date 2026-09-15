import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("A valid bearer session is required");
    }

    const principal = await this.authService.verifySession(token);
    if (!principal) {
      throw new UnauthorizedException(
        "The bearer session is invalid or expired",
      );
    }
    if (principal.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("SUPER_ADMIN role is required");
    }
    if (request.body?.userId && request.body.userId !== principal.id) {
      throw new ForbiddenException(
        "The requested actor does not match the authenticated user",
      );
    }

    request.user = principal;
    return true;
  }
}
