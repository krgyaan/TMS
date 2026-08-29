import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { openwaConfig } from '../config/openwa.config';
import { OpenwaService } from './openwa.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(openwaConfig)],
  providers: [OpenwaService],
  exports: [OpenwaService],
})
export class OpenwaModule {}