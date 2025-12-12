import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { UserProfilesService } from '@/modules/master/user-profiles/user-profiles.service';
import { UserProfilesController } from '@/modules/master/user-profiles/user-profiles.controller';
import { ProfileEditGuard } from './guards/profile-edit.guard';

@Module({
    imports: [DatabaseModule],
    controllers: [UserProfilesController],
    providers: [UserProfilesService, ProfileEditGuard],
})
export class UserProfilesModule { }
