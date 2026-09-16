import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { AuthenticatedPrincipal } from '../types';
import { getJwtExpiresIn } from './jwt.config';

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

  createAccessToken(user: AuthenticatedPrincipal): AccessTokenResult {
    const expiresIn = getJwtExpiresIn();
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        username: user.username,
      }),
      expiresIn,
    };
  }
}
