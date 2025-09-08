import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
