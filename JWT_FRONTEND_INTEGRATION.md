# Frontend JWT Integration

## API Contract

Login is the only public backend call:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

A successful response is:

```ts
interface LoginResponse {
  id: string;
  username: string;
  fullName: string;
  role: 'POS_OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  accessToken: string;
  expiresIn: number; // seconds
}
```

The former `session.token` and `session.expiresAt` fields no longer exist.

## Credential State

Store the user and `accessToken` in the frontend authentication state. Prefer in-memory storage when the application's sign-in persistence requirements allow it. If the existing application requires sign-in to survive a page reload, use `sessionStorage` and accept its XSS exposure; do not store the password or the server's `JWT_SECRET`.

Compute an optional local expiry time as `Date.now() + expiresIn * 1000`. This is for proactive UI logout only. The backend remains authoritative and may return `401` earlier after secret rotation or user deletion.

## Authenticated Requests

Attach the access token to every backend request except login:

```text
Authorization: Bearer <accessToken>
```

Example fetch wrapper:

```ts
async function apiFetch(path: string, init: RequestInit = {}) {
  const token = authStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    authStore.getState().clearAuthentication();
    window.location.assign('/login');
  }

  return response;
}
```

Use the application's existing HTTP client or interceptor rather than duplicating this logic in each API module. Preserve existing headers such as `Content-Type`, `Idempotency-Key`, and `X-Request-Id`.

## Response Handling

- `401 Unauthorized`: token is missing, malformed, expired, signed with an old secret, or belongs to a deleted user. Clear auth state and return to login. Avoid redirect loops when the failed request is itself the login call.
- `403 Forbidden`: the user is authenticated but lacks the required role, or a receipt body has a mismatched actor. Keep the user signed in and show an authorization error.
- Network or `5xx` failure: keep auth state; do not treat connectivity problems as logout.

Only one concurrent `401` handler should perform logout/navigation when several requests fail together.

## Logout

Logout is client-side: clear the token, user, and computed expiry, then navigate to login. There is no backend logout endpoint and no refresh-token flow. Do not attempt silent refresh; prompt for credentials after expiry.

## Receipt Requests

Continue sending the authenticated user's `id` as body `userId` on receipt write requests. The backend requires it to match the JWT subject and requires the current role to be `SUPER_ADMIN`.

## Migration Checklist

1. Replace reads of `session.token` with `accessToken`.
2. Replace absolute `session.expiresAt` handling with `expiresIn` seconds.
3. Add the Bearer header through the shared HTTP client.
4. Implement centralized `401` cleanup/navigation and distinct `403` handling.
5. Update logout to clear local credentials only.
6. Remove old persisted session data during the deployment migration.
7. Test login, reload persistence if used, token expiry, malformed tokens, role failures, receipt actor matching, and simultaneous `401` responses.