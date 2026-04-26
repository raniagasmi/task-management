import {
  Injectable,
  Inject,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    try {
      console.log('Validating user:', email);
      const user = await firstValueFrom(
        this.userServiceClient.send(
          { cmd: 'validate_user' },
          { email, password },
        ),
      );
      console.log('User validation result:', user);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return user;
    } catch (error) {
      console.error('User validation error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async login(user: any) {
    try {
      console.log('Creating JWT token for user:', user);
      const payload = {
        userId: user._id,
        email: user.email,
        role: user.role,
      };

      const token = this.jwtService.sign(payload);
      console.log('JWT token created successfully');

      return {
        access_token: token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          teamSize: user.teamSize,
          workspaceRole: user.workspaceRole,
          primaryUseCase: user.primaryUseCase,
          invitedTeammates: user.invitedTeammates,
          onboardingCompleted: user.onboardingCompleted,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Failed to create authentication token');
    }
  }

  async register(createUserDto: any) {
    try {
      console.log('Registering new user:', createUserDto.email);
      const result = await firstValueFrom(
        this.userServiceClient.send({ cmd: 'register_user' }, createUserDto),
      );
      console.log('Registration result:', result);

      if (!result || !result.user) {
        throw new BadRequestException('Failed to create user');
      }

      const payload = {
        userId: result.user._id,
        email: result.user.email,
        role: result.user.role,
      };

      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          teamSize: result.user.teamSize,
          workspaceRole: result.user.workspaceRole,
          primaryUseCase: result.user.primaryUseCase,
          invitedTeammates: result.user.invitedTeammates,
          onboardingCompleted: result.user.onboardingCompleted,
        },
        verificationToken: result.verificationToken,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Registration error:', errorMessage);
      if (errorMessage.includes('already exists')) {
        throw new ConflictException('User with this email already exists');
      }
      if (errorMessage.includes('validation failed')) {
        throw new BadRequestException('Invalid user data');
      }
      throw new BadRequestException('Registration failed: ' + errorMessage);
    }
  }

  async forgotPassword(email: string) {
    try {
      return await firstValueFrom(
        this.userServiceClient.send({ cmd: 'forgot_password' }, { email }),
      );
    } catch (error) {
      this.rethrowRpcError(error);
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      return await firstValueFrom(
        this.userServiceClient.send({ cmd: 'reset_password' }, { token, newPassword }),
      );
    } catch (error) {
      this.rethrowRpcError(error);
    }
  }

  async verifyEmail(token: string) {
    try {
      return await firstValueFrom(
        this.userServiceClient.send({ cmd: 'verify_email' }, { token }),
      );
    } catch (error) {
      this.rethrowRpcError(error);
    }
  }

  async resendVerification(email: string) {
    try {
      return await firstValueFrom(
        this.userServiceClient.send({ cmd: 'resend_verification' }, { email }),
      );
    } catch (error) {
      this.rethrowRpcError(error);
    }
  }

  async initiateSso(provider: string, email?: string) {
    try {
      return await firstValueFrom(
        this.userServiceClient.send({ cmd: 'initiate_sso' }, { provider, email }),
      );
    } catch (error) {
      this.rethrowRpcError(error);
    }
  }

  private rethrowRpcError(error: unknown): never {
    const payload = typeof error === 'object' && error !== null
      ? (error as { statusCode?: number; status?: number | string; message?: string | string[] })
      : {};

    const rawStatus = payload.statusCode ?? payload.status;
    const statusCode =
      typeof rawStatus === 'number'
        ? rawStatus
        : typeof rawStatus === 'string' && /^\d+$/.test(rawStatus)
          ? Number(rawStatus)
          : 500;
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message || 'Internal server error';

    if (statusCode >= 400 && statusCode < 600) {
      throw new HttpException({ statusCode, message }, statusCode);
    }

    throw new InternalServerErrorException(message);
  }
}
