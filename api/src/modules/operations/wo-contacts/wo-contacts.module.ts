import { Module } from '@nestjs/common';
import { WoContactsController } from './wo-contacts.controller';
import { WoContactsService } from './wo-contacts.service';
import { DatabaseModule } from '@/db/database.module';
import { ClientDirectoryModule } from '@/modules/shared/client-directory/client-directory.module';

@Module({
    imports: [DatabaseModule, ClientDirectoryModule],
    controllers: [WoContactsController],
    providers: [WoContactsService],
    exports: [WoContactsService],
})
export class WoContactsModule {}
