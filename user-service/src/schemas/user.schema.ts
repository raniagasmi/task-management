import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    EMPLOYEE = 'employee',
    DEVELOPER = 'developer',
    SALES_REP = 'sales rep',
    HR = 'hr',
    FINANCE = 'finance',
    MARKETER = 'marketer',
}

export enum PresenceStatus {
    ONLINE = 'ONLINE',
    PAUSE = 'PAUSE',
    OFFLINE = 'OFFLINE',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    firstName!: string;

    @Prop({ required: true })
    lastName!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ type: String, enum: UserRole, default: UserRole.EMPLOYEE })
    role!: UserRole;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ type: String, enum: PresenceStatus, default: PresenceStatus.OFFLINE })
    presenceStatus!: PresenceStatus;

    @Prop({ type: Date, default: null })
    lastActiveAt!: Date | null;

    @Prop({ type: Date, default: null })
    presenceUpdatedAt!: Date | null;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
