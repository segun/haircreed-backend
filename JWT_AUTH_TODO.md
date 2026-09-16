# JWT Authentication Implementation

## Policy

Every backend route requires a signed JWT except `POST /api/v1/auth/login`. Authentication is enforced by a global Passport JWT guard; route-specific guards continue to enforce roles and receipt actor matching.

The JWT strategy extracts `Authorization: Bearer <token>`, verifies the signature and expiration, reads the user ID from `sub`, and reloads the user on every request. Deleted users are rejected and current database roles are used for authorization. Password hashes are never placed in the token or `request.user`.

## Token Contract

Access tokens contain:

```ts
interface AccessTokenClaims {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}
```

Successful login returns:

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

`expiresIn` is the token lifetime in seconds, not an absolute timestamp.

## Server Configuration

- `JWT_SECRET` is required. Startup fails if it is absent.
- `JWT_EXPIRES_IN` is an optional positive integer in seconds and defaults to `28800` (eight hours).
- Production must source a long random `JWT_SECRET` from the hosting platform's secret manager. Never commit it or expose it to the frontend.
- Rotating `JWT_SECRET` immediately rejects all tokens signed with the previous secret. Coordinate rotation with a forced frontend sign-in.

## Revocation And Logout

This implementation uses stateless access tokens with client-side logout. Logout removes the token from frontend storage; there is no backend logout or per-token denylist. Tokens remain cryptographically valid until expiration unless the user is deleted or `JWT_SECRET` is rotated. Role changes apply immediately because the strategy reloads the current user for every request.

## Receipt Authorization

Receipt routes require the current database role to be `SUPER_ADMIN`. For receipt write requests, body `userId` must equal authenticated `request.user.id`; a mismatch returns `403 Forbidden`.

## Deployment Checklist

1. Install dependencies and deploy the backend with `JWT_SECRET` and `JWT_EXPIRES_IN` configured.
2. Deploy frontend JWT handling from [JWT_FRONTEND_INTEGRATION.md](JWT_FRONTEND_INTEGRATION.md) at the same time as the backend response change.
3. Existing custom session tokens will stop working. Users must sign in again.
4. Verify login, one authenticated request, an expired or malformed token (`401`), and an insufficient role (`403`).

## Verification Status

- Custom HMAC signing, parsing, session creation, verification, and revocation have been removed.
- Global JWT authentication and fresh-user authorization are implemented.
- Receipt `SUPER_ADMIN` and actor checks are preserved.
- Authorization guard unit tests pass.
- Dependency lock update, JWT-specific tests, full tests, e2e tests, and build remain to be run after registry access is available.