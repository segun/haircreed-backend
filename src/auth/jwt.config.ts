export const DEFAULT_JWT_EXPIRES_IN = 8 * 60 * 60;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function getJwtExpiresIn(): number {
  const value = process.env.JWT_EXPIRES_IN;
  if (!value) {
    return DEFAULT_JWT_EXPIRES_IN;
  }

  const expiresIn = Number(value);
  if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
    throw new Error('JWT_EXPIRES_IN must be a positive integer in seconds');
  }
  return expiresIn;
}