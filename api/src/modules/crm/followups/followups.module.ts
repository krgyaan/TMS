import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowupsController } from './followups.controller';
import { FollowupsService } from './followups.service';

@Module({
    imports: [DatabaseModule],
    controllers: [FollowupsController],
    providers: [FollowupsService],
    exports: [FollowupsService],
})
export class FollowupsModule {}