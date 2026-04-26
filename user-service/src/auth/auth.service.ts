import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { CreateUserDto, LoginUserDto } from '../dto/user.dto';
import { keys } from '../config/keys';

@Injectable()
export class AuthService {
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
            return {
                success: true,
                message: 'If an account exists for that email, a reset link has been prepared.',
            };
        }

        const resetToken = randomBytes(24).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await user.save();

        return {
            success: true,
            message: 'Password reset instructions prepared.',
            resetToken,
        };
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
}
