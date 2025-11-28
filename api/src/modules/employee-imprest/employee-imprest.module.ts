import { Module } from '@nestjs/common';
import { EmployeeImprestController } from './employee-imprest.controller';
import { EmployeeImprestService } from './employee-imprest.service';
import { DatabaseModule } from '../../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeeImprestController],
  providers: [EmployeeImprestService],
  exports: [EmployeeImprestService],
})
export class EmployeeImprestModule {}
