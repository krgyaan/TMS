import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ClientDirectoryController } from './client-directory.controller';
import { ClientDirectoryService } from './client-directory.service';
import { ClientDirectorySyncService } from './client-directory-sync.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ClientDirectoryController],
    providers: [ClientDirectoryService, ClientDirectorySyncService],
    exports: [ClientDirectoryService, ClientDirectorySyncService],
})
export class ClientDirectoryModule {}
