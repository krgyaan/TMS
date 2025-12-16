import { Module } from '@nestjs/common';
import { ImprestAdminController } from './imprest-admin.controller';
import { ImprestAdminService } from './imprest-admin.service';

@Module({
  controllers: [ImprestAdminController],
  providers: [ImprestAdminService]
})
export class ImprestAdminModule {}
