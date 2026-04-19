import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { JwtStrategy } from './auth/jwt.strategy';
import { User, UserSchema } from './schemas/user.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditLogController } from './audit/audit-log.controller';
import { AuditLogService } from './audit/audit-log.service';
import { keys } from './config/keys';

@Module({
  imports: [
    MongooseModule.forRoot(keys.mongoURI.toString()),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: keys.jwtSecret,
      signOptions: { expiresIn: keys.jwtExpiresIn },
    }),
  ],
  controllers: [AppController, AuthController, UserController, AuditLogController],
  providers: [AppService, AuthService, UserService, JwtStrategy, AuditLogService],
})
export class AppModule {}
