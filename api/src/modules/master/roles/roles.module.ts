import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
