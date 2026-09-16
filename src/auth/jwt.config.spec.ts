import {
  DEFAULT_JWT_EXPIRES_IN,
  getJwtExpiresIn,
  getJwtSecret,
} from './jwt.config';

describe('JWT configuration', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiresIn = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpiresIn;
  });

  it('requires a signing secret', () => {
    delete process.env.JWT_SECRET;
    expect(getJwtSecret).toThrow('JWT_SECRET environment variable is required');
  });

  it('uses the configured signing secret', () => {
    process.env.JWT_SECRET = 'test-secret';
    expect(getJwtSecret()).toBe('test-secret');
  });

  it('defaults the token lifetime to eight hours', () => {
    delete process.env.JWT_EXPIRES_IN;
    expect(getJwtExpiresIn()).toBe(DEFAULT_JWT_EXPIRES_IN);
  });

  it('rejects a non-positive or non-integer token lifetime', () => {
    process.env.JWT_EXPIRES_IN = '1.5';
    expect(getJwtExpiresIn).toThrow(
      'JWT_EXPIRES_IN must be a positive integer in seconds',
    );
  });
});