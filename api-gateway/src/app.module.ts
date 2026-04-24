import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth/auth.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'user-service', port: 3005 },
      },
      {
        name: 'TASK_SERVICE',
        transport: Transport.TCP,
        options: { host: 'task-service', port: 3002 },
      },
    ]),
    AuthModule,
    CollaborationModule,
    RecruitmentModule,
    TaskModule,
    UserModule,
    DashboardModule,
  ],
  providers: [],
})
export class AppModule {}
