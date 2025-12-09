import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { UserProfilesService } from '@/modules/master/user-profiles/user-profiles.service';
import { UserProfilesController } from '@/modules/master/user-profiles/user-profiles.controller';

@Module({
    imports: [DatabaseModule],
    controllers: [UserProfilesController],
    providers: [UserProfilesService],
})
export class UserProfilesModule { }
