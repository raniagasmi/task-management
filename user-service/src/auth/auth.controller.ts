import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  ForgotPasswordDto,
  InitiateSsoDto,
  LoginUserDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../dto/user.dto';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @MessagePattern({ cmd: 'validate_user' })
  async validateUser(@Payload() data: { email: string; password: string }) {
    try {
      return await this.authService.validateUser(data.email, data.password);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'register_user' })
  async registerUser(@Payload() createUserDto: CreateUserDto) {
    try {
      return await this.authService.register(createUserDto);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerification(body.email);
  }

  @Post('sso/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateSso(@Body() body: InitiateSsoDto) {
    return this.authService.initiateSso(body.provider, body.email);
  }

  @MessagePattern({ cmd: 'forgot_password' })
  async forgotPasswordMessage(@Payload() body: ForgotPasswordDto) {
    try {
      return await this.authService.forgotPassword(body.email);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPasswordMessage(@Payload() body: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(body.token, body.newPassword);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'verify_email' })
  async verifyEmailMessage(@Payload() body: VerifyEmailDto) {
    try {
      return await this.authService.verifyEmail(body.token);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'resend_verification' })
  async resendVerificationMessage(@Payload() body: ResendVerificationDto) {
    try {
      return await this.authService.resendVerification(body.email);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'initiate_sso' })
  async initiateSsoMessage(@Payload() body: InitiateSsoDto) {
    try {
      return await this.authService.initiateSso(body.provider, body.email);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  private toRpcException(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray((response as { message?: unknown }).message)
            ? (response as { message: string[] }).message.join(', ')
            : ((response as { message?: string }).message ?? error.message);

      return new RpcException({
        statusCode: error.getStatus(),
        message,
      });
    }

    return new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
