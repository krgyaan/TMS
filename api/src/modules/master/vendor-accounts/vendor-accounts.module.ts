import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { VendorAccountsController } from '@/modules/master/vendor-accounts/vendor-accounts.controller';
import { VendorAccountsService } from '@/modules/master/vendor-accounts/vendor-accounts.service';

@Module({
    imports: [DatabaseModule],
    controllers: [VendorAccountsController],
    providers: [VendorAccountsService],
    exports: [VendorAccountsService],
})
export class VendorAccountsModule { }
