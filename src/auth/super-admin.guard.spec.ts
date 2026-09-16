import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { SuperAdminGuard } from "./super-admin.guard";

describe("SuperAdminGuard", () => {
  const guard = new SuperAdminGuard();

  const context = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);

  it("rejects requests without an authenticated principal", () => {
    expect(() =>
      guard.canActivate(context({ headers: {}, body: {} })),
    ).toThrow(UnauthorizedException);
  });

  it("rejects authenticated users without the SUPER_ADMIN role", () => {
    expect(() =>
      guard.canActivate(
        context({ user: { id: "user-1", role: "ADMIN" }, body: {} }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("rejects a body actor that differs from the authenticated principal", () => {
    expect(() =>
      guard.canActivate(
        context({
          user: { id: "user-1", role: "SUPER_ADMIN" },
          body: { userId: "user-2" },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("allows a matching SUPER_ADMIN principal", () => {
    const principal = { id: "user-1", role: "SUPER_ADMIN" };
    const request = {
      user: principal,
      body: { userId: "user-1" },
    } as any;

    expect(guard.canActivate(context(request))).toBe(true);
  });
});
