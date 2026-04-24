import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'user-service', port: 3005 },
      },
    ]),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService, CollaborationGateway],
  exports: [CollaborationGateway],
})
export class CollaborationModule {}
