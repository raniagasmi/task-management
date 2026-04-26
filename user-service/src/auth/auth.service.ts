import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { CreateUserDto, LoginUserDto } from '../dto/user.dto';
import { keys } from '../config/keys';

const PASSWORD_RESET_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0f3d3a 0%, #1f6f6a 50%, #319795 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <div style="background: linear-gradient(135deg, #319795 0%, #2c7a7b 100%); padding: 50px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">Flexity</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Password Reset</p>
      </div>
      <div style="padding: 50px 40px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="color: #1f4f4f; margin-bottom: 16px;">Reset your password 🔐</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
        </div>
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{RESET_LINK}}" style="background: #319795; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; display: inline-block; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <div style="background: #f0fafa; border-radius: 16px; padding: 24px; border-left: 4px solid #319795;">
          <h3 style="margin-top: 0; color: #1f4f4f;">Instructions</h3>
          <p style="margin: 8px 0; color: #555;">1. Click the reset button above</p>
          <p style="margin: 8px 0; color: #555;">2. Enter your new password</p>
          <p style="margin: 0; color: #555;">3. Confirm and login</p>
        </div>
        <div style="background: rgba(255, 193, 7, 0.1); border-radius: 12px; padding: 16px; margin-top: 24px;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            This link will expire in 15 minutes for security reasons.
          </p>
        </div>
        <div style="text-align: center; margin-top: 40px;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="color: #1f4f4f; font-weight: 600;">
            - The Flexity Team
          </p>
        </div>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: rgba(255,255,255,0.7); font-size: 12px;">
        This is an automated message. Please do not reply.
      </p>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px;">
        Copyright 2026 Flexity. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

@Injectable()
export class AuthService {
    private readonly mailTransporter = nodemailer.createTransport({
        host: keys.mailtrapHost,
        port: keys.mailtrapPort,
        auth: {
            user: keys.mailtrapUser,
            pass: keys.mailtrapPass,
        },
    });

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) {}

    async register(createUserDto: CreateUserDto): Promise<{ token: string; user: Partial<UserDocument>; verificationToken: string }> {
        try {
            const { email, password, teamSize, primaryUseCase, invitedTeammates } = createUserDto;

            const existingUser = await this.userModel.findOne({ email });
            if (existingUser) {
                throw new ConflictException('User with this email already exists');
            }

            const userRole = UserRole.EMPLOYEE;

            const hashedPassword = await bcrypt.hash(password, keys.bcryptSaltRounds);
            const verificationToken = randomBytes(24).toString('hex');

            const newUser = await this.userModel.create({
                ...createUserDto,
                role: userRole,
                password: hashedPassword,
                isActive: true,
                emailVerified: false,
                emailVerificationToken: verificationToken,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
                teamSize: teamSize ?? '',
                primaryUseCase: primaryUseCase ?? '',
                invitedTeammates: invitedTeammates ?? [],
                onboardingCompleted: false,
            });

            const token = this.jwtService.sign({ 
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role 
            });

            const { password: _, ...userData } = newUser.toObject();

            return { 
                token,
                user: userData,
                verificationToken,
            };
        } catch (error) {
            if (error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new BadRequestException('Failed to register user: ' + message);
        }
    }

    async login(loginUserDto: LoginUserDto): Promise<{ token: string }> {
        const { email, password } = loginUserDto;
        
        const user = await this.validateUser(email, password);
        
        const token = this.jwtService.sign({
            userId: user._id,
            email: user.email,
            role: user.role
        });

        return { token };
    }

    async validateUser(email: string, password: string): Promise<UserDocument> {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    async forgotPassword(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.userModel.findOne({ email: normalizedEmail });

        if (!user) {
            throw new NotFoundException('Email not found');
        }

        const resetToken = randomBytes(24).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 15);

        try {
            await user.save();
            await this.sendPasswordResetEmail(user.email, resetToken);
            return {
                success: true,
                message: 'Check your email to reset password',
            };
        } catch (error) {
            user.resetPasswordToken = null;
            user.resetPasswordExpiresAt = null;
            await user.save();
            const message = error instanceof Error ? error.message : 'Unable to send reset email';
            throw new InternalServerErrorException(message);
        }
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: new Date() },
        });

        if (!user) {
            throw new BadRequestException('This password reset link is invalid or has expired.');
        }

        user.password = await bcrypt.hash(newPassword, keys.bcryptSaltRounds);
        user.resetPasswordToken = null;
        user.resetPasswordExpiresAt = null;
        await user.save();

        return {
            success: true,
            message: 'Password updated successfully.',
        };
    }

    async resendVerification(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.userModel.findOne({ email: normalizedEmail });

        if (!user) {
            return {
                success: true,
                message: 'If an account exists for that email, a verification link has been prepared.',
            };
        }

        if (user.emailVerified) {
            return {
                success: true,
                message: 'This email is already verified.',
            };
        }

        const verificationToken = randomBytes(24).toString('hex');
        user.emailVerificationToken = verificationToken;
        await user.save();

        return {
            success: true,
            message: 'Verification link prepared.',
            verificationToken,
        };
    }

    async verifyEmail(token: string) {
        const user = await this.userModel.findOne({ emailVerificationToken: token });

        if (!user) {
            throw new BadRequestException('This verification link is invalid.');
        }

        user.emailVerified = true;
        user.emailVerificationToken = null;
        await user.save();

        return {
            success: true,
            message: 'Email verified successfully.',
            user: this.stripSensitiveFields(user),
        };
    }

    async initiateSso(provider: string, email?: string) {
        return {
            success: true,
            provider,
            available: false,
            message: `Enterprise ${provider} SSO is provisioned during workspace setup. Use book demo to enable it for your team.`,
            email: email?.trim().toLowerCase() ?? '',
        };
    }

    private stripSensitiveFields(user: UserDocument) {
        const {
            password: _password,
            emailVerificationToken: _emailVerificationToken,
            resetPasswordToken: _resetPasswordToken,
            resetPasswordExpiresAt: _resetPasswordExpiresAt,
            ...safeUser
        } = user.toObject();
        return safeUser;
    }

    private async sendPasswordResetEmail(email: string, resetToken: string) {
        const resetLink = `${keys.frontendResetPasswordUrl}?token=${encodeURIComponent(resetToken)}`;
        const html = PASSWORD_RESET_EMAIL_TEMPLATE.replace('{{RESET_LINK}}', resetLink);

        await this.mailTransporter.sendMail({
            from: keys.mailFrom,
            to: email,
            subject: 'Reset your Flexity password',
            html,
        });
    }
}
