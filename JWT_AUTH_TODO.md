# TODO: Replace Custom Sessions with JWT Authentication

## Goal

Replace the custom HMAC session token implementation with standard JWT authentication using NestJS JWT and Passport. Receipt authorization must continue to require an authenticated `SUPER_ADMIN` whose ID matches the request body's `userId`.

JWT still requires private server-side signing material. Replace `AUTH_SESSION_SECRET` with `JWT_SECRET`; the improvement is that token creation, expiration, signature verification, Bearer parsing, and request-principal population are handled by established libraries instead of custom code.

## Dependencies

- [ ] Install NestJS 7-compatible versions of `@nestjs/jwt`, `@nestjs/passport`, `passport`, and `passport-jwt`.
- [ ] Install the matching `@types/passport-jwt` development dependency.
- [ ] Keep `@instantdb/admin` pinned to `0.22.6`; do not allow dependency installation to move it back to `latest`.
- [ ] Update `yarn.lock` without introducing unrelated lockfile churn.

## Backend Implementation

- [ ] Add `JWT_SECRET` and `JWT_EXPIRES_IN` configuration to `.env.example`.
- [ ] Fail application startup with a clear error when `JWT_SECRET` is missing.
- [ ] Configure `JwtModule` in `src/auth/auth.module.ts` using the environment values.
- [ ] Add a Passport JWT strategy that:
  - Extracts the token from `Authorization: Bearer <token>`.
  - Verifies the JWT signature and expiration.
  - Reads the user ID from the standard `sub` claim.
  - Reloads the current user through `UsersService.findOneById()`.
  - Rejects deleted or unknown users.
  - Returns an `AuthenticatedPrincipal` without `passwordHash`.
- [ ] Change login to sign a JWT after username/password validation.
- [ ] Use claims with this minimum shape:

```ts
interface AccessTokenClaims {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}
```

- [ ] Return a documented login response such as:

```json
{
  "id": "user-id",
  "username": "admin",
  "fullName": "Super Admin",
  "role": "SUPER_ADMIN",
  "accessToken": "jwt-token",
  "expiresIn": 28800
}
```

- [ ] Replace `SuperAdminGuard` token parsing and `AuthService.verifySession()` with Passport's JWT auth guard plus a role guard/decorator.
- [ ] Preserve the receipt-specific actor check: authenticated `request.user.id` must equal body `userId`.
- [ ] Prefer authorization based on the freshly loaded database user role rather than trusting a potentially stale role claim.
- [ ] Apply JWT authentication only to the intended protected routes initially, including both receipt endpoints; do not silently change access rules for unrelated legacy endpoints.

## Remove Custom Authentication Code

- [ ] Remove `AuthService.createSession()`.
- [ ] Remove `AuthService.verifySession()`.
- [ ] Remove `AuthService.revokeSessions()` unless a JWT revocation design is explicitly retained.
- [ ] Remove direct `crypto.createHmac()` and `timingSafeEqual()` token handling.
- [ ] Remove `AuthSessionResult`.
- [ ] Remove all `AUTH_SESSION_SECRET` references from source, `.env.example`, tests, and documentation.
- [ ] Decide whether logout means client-side token deletion only or requires server-side revocation.

## Revocation Decision

JWT access tokens are normally stateless and cannot be individually revoked before expiration without additional state.

- [ ] Choose and document one policy:
  - Short-lived access tokens with client-side logout only.
  - A `tokenVersion`/user-version claim checked against InstantDB on each request.
  - Refresh tokens stored server-side with rotation and revocation.
- [ ] For the current eight-hour lifetime, prefer either a shorter access-token lifetime or a user-version check if immediate role/password-change revocation is required.
- [ ] Do not use `Users.updatedAt` as an undocumented revocation mechanism after the migration.

## Frontend Contract

- [ ] Update the frontend login flow to store `accessToken` instead of `session.token`.
- [ ] Send `Authorization: Bearer <accessToken>` on protected requests.
- [ ] Handle `401` by clearing expired credentials and returning to login.
- [ ] Keep sending the matching receipt `userId` until the receipt DTO contract is separately simplified.
- [ ] Coordinate deployment so the backend JWT response and frontend token handling change together.

## Documentation

- [ ] Update `RECEIPTS_BACKEND_API.md` to describe JWT Bearer authentication and remove custom-session wording.
- [ ] Document `JWT_SECRET`, `JWT_EXPIRES_IN`, token lifetime, logout behavior, and key rotation.
- [ ] Add deployment guidance: use a long random secret from the hosting platform's secret manager and never commit it or expose it to the frontend.

## Tests

- [ ] Login with valid credentials returns a signed JWT and sanitized user data.
- [ ] Invalid credentials return `401` and no token.
- [ ] A valid JWT populates `request.user` with the current database user.
- [ ] Missing, malformed, tampered, and expired JWTs return `401`.
- [ ] A JWT for a deleted user returns `401`.
- [ ] A non-`SUPER_ADMIN` JWT returns `403` on receipt endpoints.
- [ ] A valid `SUPER_ADMIN` JWT with a different body `userId` returns `403`.
- [ ] A matching `SUPER_ADMIN` JWT reaches the receipt service.
- [ ] Role changes take effect according to the chosen fresh-user/revocation policy.
- [ ] Add Supertest coverage for login followed by an authenticated receipt request.

## Verification

- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run test:e2e -- --runInBand`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Verify no references to `AUTH_SESSION_SECRET`, `createSession`, or `verifySession` remain.
- [ ] Verify a token generated before `JWT_SECRET` rotation is rejected afterward.

## Completion Criteria

- No custom token signing or parsing remains.
- JWT signature and expiration validation are delegated to NestJS JWT and Passport.
- Receipt routes still enforce authenticated `SUPER_ADMIN` access and actor matching.
- Backend and frontend agree on the final login response and Bearer-token format.
- Authentication, authorization, build, and e2e tests pass.
