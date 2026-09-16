import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { createHmac, timingSafeEqual } from 'crypto';
import db from '../database/database';
import { AuthenticatedPrincipal } from '../types';

export interface AuthSessionResult {
  token: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  private get sessionSecret(): string {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) {
      throw new Error('AUTH_SESSION_SECRET environment variable is required');
    }
    return secret;
  }

  /**
   * Validates a user based on username and password.
   * @param username The user's username.
   * @param pass The user's plain text password.
   * @returns The user object without the password hash if validation is successful, otherwise null.
   */
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);

    // Check if user exists and if the provided password matches the stored hash
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user; // Exclude password hash from the result
      return result;
    }
    return null;
  }

  async createSession(userId: string): Promise<AuthSessionResult> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new Error('Cannot create a session for an unknown user');
    }

    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    const sessionVersion = user.updatedAt;
    const unsignedToken = `${userId}.${expiresAt}.${sessionVersion}`;
    const signature = this.sign(unsignedToken);

    return {
      token: `${unsignedToken}.${signature}`,
      expiresAt,
    };
  }

  async verifySession(token: string): Promise<AuthenticatedPrincipal | null> {
    const [userId, expiresAtText, versionText, signature, ...extra] = token.split('.');
    if (!userId || !expiresAtText || !versionText || !signature || extra.length > 0) {
      return null;
    }

    const unsignedToken = `${userId}.${expiresAtText}.${versionText}`;
    const expectedSignature = this.sign(unsignedToken);
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const expiresAt = Number(expiresAtText);
    const sessionVersion = Number(versionText);
    if (
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() ||
      !Number.isSafeInteger(sessionVersion) ||
      sessionVersion < 0
    ) {
      return null;
    }

    const user = await this.usersService.findOneById(userId);
    if (!user || user.updatedAt !== sessionVersion) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
  }

  async revokeSessions(userId: string): Promise<void> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      return;
    }

    await db.transact([
      db.tx.Users[userId].update({
        updatedAt: Date.now(),
      }),
    ]);
  }

  private sign(value: string): string {
    return createHmac('sha256', this.sessionSecret).update(value).digest('hex');
  }
}
