import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [DesignationsController],
  providers: [DesignationsService],
})
export class DesignationsModule {}
