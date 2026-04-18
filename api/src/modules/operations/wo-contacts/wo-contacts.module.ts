import { Module } from '@nestjs/common';
import { WoContactsController } from './wo-contacts.controller';
import { WoContactsService } from './wo-contacts.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [WoContactsController],
    providers: [WoContactsService],
    exports: [WoContactsService],
})
export class WoContactsModule {}
