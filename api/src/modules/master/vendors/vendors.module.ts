import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { VendorsController } from '@/modules/master/vendors/vendors.controller';
import { VendorsService } from '@/modules/master/vendors/vendors.service';
import { ClientDirectoryModule } from '@/modules/shared/client-directory/client-directory.module';

@Module({
  imports: [DatabaseModule, ClientDirectoryModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
