import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { CollaborationModule } from '../collaboration/collaboration.module';

@Module({
  imports: [
    AuthModule,
    CollaborationModule,
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'user-service',
          port: 3005,
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, AuditService],
  exports: [UserService, AuditService],
})
export class UserModule {}
