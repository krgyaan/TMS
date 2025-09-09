import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../db/database.module';
import { UserProfilesService } from './user-profiles.service';
import { UserProfilesController } from './user-profiles.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UserProfilesController],
  providers: [UserProfilesService],
})
export class UserProfilesModule {}
