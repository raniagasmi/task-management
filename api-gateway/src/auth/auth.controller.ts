import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      return this.authService.login(user);
    } catch (error) {
      console.error('Login error in controller:', error);
      throw error;
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: any) {
    if (
      !createUserDto.email ||
      !createUserDto.password ||
      !createUserDto.firstName ||
      !createUserDto.lastName
    ) {
      throw new BadRequestException('Missing required fields');
    }
    return this.authService.register(createUserDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    if (!body?.token || !body?.newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    if (!body?.token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.resendVerification(body.email);
  }

  @Post('sso/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateSso(@Body() body: { provider: string; email?: string }) {
    if (!body?.provider) {
      throw new BadRequestException('Provider is required');
    }
    return this.authService.initiateSso(body.provider, body.email);
  }
}
