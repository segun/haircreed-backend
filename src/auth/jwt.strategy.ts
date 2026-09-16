import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedPrincipal } from '../types';
import { UsersService } from '../users/users.service';
import { getJwtSecret } from './jwt.config';

export interface AccessTokenClaims {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenClaims): Promise<AuthenticatedPrincipal> {
    if (!payload.sub) {
      throw new UnauthorizedException('The access token has no subject');
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('The access token user no longer exists');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
  }
}