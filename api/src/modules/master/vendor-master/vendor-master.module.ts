import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";
import { VendorMasterController } from "@/modules/master/vendor-master/vendor-master.controller";
import { VendorMasterService } from "@/modules/master/vendor-master/vendor-master.service";

@Module({
    imports: [DatabaseModule, ClientDirectoryModule],
    controllers: [VendorMasterController],
    providers: [VendorMasterService],
    exports: [VendorMasterService],
})
export class VendorMasterModule {}
