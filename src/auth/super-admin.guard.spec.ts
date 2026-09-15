import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SuperAdminGuard } from "./super-admin.guard";

describe("SuperAdminGuard", () => {
  const authService = { verifySession: jest.fn() } as unknown as AuthService;
  const guard = new SuperAdminGuard(authService);

  const context = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);

  beforeEach(() => jest.clearAllMocks());

  it("rejects requests without a bearer session", async () => {
    await expect(
      guard.canActivate(context({ headers: {}, body: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects authenticated users without the SUPER_ADMIN role", async () => {
    (authService.verifySession as jest.Mock).mockResolvedValue({
      id: "user-1",
      role: "ADMIN",
    });

    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer token" }, body: {} }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects a body actor that differs from the authenticated principal", async () => {
    (authService.verifySession as jest.Mock).mockResolvedValue({
      id: "user-1",
      role: "SUPER_ADMIN",
    });

    await expect(
      guard.canActivate(
        context({
          headers: { authorization: "Bearer token" },
          body: { userId: "user-2" },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("attaches a matching SUPER_ADMIN principal to the request", async () => {
    const principal = { id: "user-1", role: "SUPER_ADMIN" };
    const request = {
      headers: { authorization: "Bearer token" },
      body: { userId: "user-1" },
    } as any;
    (authService.verifySession as jest.Mock).mockResolvedValue(principal);

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.user).toBe(principal);
  });
});
