import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { TransportersController } from "@/modules/master/transporters/transporters.controller";
import { TransportersService } from "@/modules/master/transporters/transporters.service";

@Module({
    imports: [DatabaseModule],
    controllers: [TransportersController],
    providers: [TransportersService],
    exports: [TransportersService],
})
export class TransportersModule {}
