import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { VendorOrganizationsController } from './vendor-organizations.controller';
import { VendorOrganizationsService } from './vendor-organizations.service';

@Module({
    imports: [DatabaseModule],
    controllers: [VendorOrganizationsController],
    providers: [VendorOrganizationsService],
    exports: [VendorOrganizationsService],
})
export class VendorOrganizationsModule { }
