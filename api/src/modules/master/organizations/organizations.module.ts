import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { OrganizationsController } from '@/modules/master/organizations/organizations.controller';
import { OrganizationsService } from '@/modules/master/organizations/organizations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
