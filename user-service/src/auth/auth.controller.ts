import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, ForgotPasswordDto, InitiateSsoDto, LoginUserDto, ResendVerificationDto, ResetPasswordDto, VerifyEmailDto } from '../dto/user.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

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
        return this.authService.validateUser(data.email, data.password);
    }

    @MessagePattern({ cmd: 'register_user' })
    async registerUser(@Payload() createUserDto: CreateUserDto) {
        try {
            return await this.authService.register(createUserDto);
        } catch (error) {
            throw error;
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
        return this.authService.forgotPassword(body.email);
    }

    @MessagePattern({ cmd: 'reset_password' })
    async resetPasswordMessage(@Payload() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    @MessagePattern({ cmd: 'verify_email' })
    async verifyEmailMessage(@Payload() body: VerifyEmailDto) {
        return this.authService.verifyEmail(body.token);
    }

    @MessagePattern({ cmd: 'resend_verification' })
    async resendVerificationMessage(@Payload() body: ResendVerificationDto) {
        return this.authService.resendVerification(body.email);
    }

    @MessagePattern({ cmd: 'initiate_sso' })
    async initiateSsoMessage(@Payload() body: InitiateSsoDto) {
        return this.authService.initiateSso(body.provider, body.email);
    }
}
