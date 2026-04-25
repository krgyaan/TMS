import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { DatabaseModule } from '@/db/database.module';
import { OnboardingModule } from '../hrms/onboarding/onboarding.module';

@Module({
  imports: [DatabaseModule, OnboardingModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
