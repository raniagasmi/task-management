import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { keys } from '../config/keys';

interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: keys.jwtSecret,
        });
    }

    async validate(payload: JwtPayload) {
        if (!payload || !payload.userId) {
            throw new UnauthorizedException('Invalid token payload');
        }

        return {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        };
    }
}
