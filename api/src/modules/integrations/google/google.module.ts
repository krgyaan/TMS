import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../../db/database.module';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [GoogleController],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class GoogleIntegrationModule {}
