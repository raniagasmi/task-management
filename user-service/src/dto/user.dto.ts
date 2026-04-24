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
}

export class UpdatePresenceDto {
    @IsOptional()
    @IsEnum(PresenceStatus)
    status?: PresenceStatus;

    @IsOptional()
    @IsISO8601()
    lastActiveAt?: string;
}
