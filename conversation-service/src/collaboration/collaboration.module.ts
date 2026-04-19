import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { TaskProposal, TaskProposalSchema } from './schemas/task-proposal.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_HOST ?? 'user-service',
          port: process.env.USER_SERVICE_PORT ? parseInt(process.env.USER_SERVICE_PORT, 10) : 3005,
        },
      },
      {
        name: 'TASK_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.TASK_SERVICE_HOST ?? 'task-service',
          port: process.env.TASK_SERVICE_PORT ? parseInt(process.env.TASK_SERVICE_PORT, 10) : 3002,
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: TaskProposal.name, schema: TaskProposalSchema },
    ]),
  ],
  controllers: [CollaborationController, AiController],
  providers: [CollaborationService, AiService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
