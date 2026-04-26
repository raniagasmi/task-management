import { IsEmail, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PresenceStatus, UserRole } from '../schemas/user.schema';

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    firstName!: string;

    @IsNotEmpty()
    @IsString()
    lastName!: string;

    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password!: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsString()
    teamSize?: string;

    @IsOptional()
    @IsString()
    primaryUseCase?: string;

    @IsOptional()
    @IsString()
    workspaceRole?: string;

    @IsOptional()
    invitedTeammates?: string[];
}

export class LoginUserDto {
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsNotEmpty()
    @IsString()
    password!: string;
}

export class UpdateUserDto {
    @IsString()
    firstName?: string;

    @IsString()
    lastName?: string;

    @IsEmail()
    email?: string;

    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsString()
    teamSize?: string;

    @IsOptional()
    @IsString()
    primaryUseCase?: string;

    @IsOptional()
    @IsString()
    workspaceRole?: string;

    @IsOptional()
    invitedTeammates?: string[];

    @IsOptional()
    onboardingCompleted?: boolean;
}

export class UpdatePresenceDto {
    @IsOptional()
    @IsEnum(PresenceStatus)
    status?: PresenceStatus;

    @IsOptional()
    @IsISO8601()
    lastActiveAt?: string;
}

export class ForgotPasswordDto {
    @IsNotEmpty()
    @IsEmail()
    email!: string;
}

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    token!: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    newPassword!: string;
}

export class VerifyEmailDto {
    @IsNotEmpty()
    @IsString()
    token!: string;
}

export class ResendVerificationDto {
    @IsNotEmpty()
    @IsEmail()
    email!: string;
}

export class InitiateSsoDto {
    @IsNotEmpty()
    @IsString()
    provider!: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
