import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruitmentModule } from './recruitment/recruitment.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/recruitment-service',
    ),
    RecruitmentModule,
  ],
})
export class AppModule {}
