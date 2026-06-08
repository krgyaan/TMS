// src/modules/hrms/employee-onboarding/employee-onboarding.module.ts

import { Module } from '@nestjs/common';
import { EmployeeOnboardingService } from './employee-onboarding.service';
import { EmployeeOnboardingController } from './employee-onboarding.controller';

@Module({
  providers: [EmployeeOnboardingService],
  controllers: [EmployeeOnboardingController],
  exports: [EmployeeOnboardingService],
})
export class EmployeeOnboardingModule {}
