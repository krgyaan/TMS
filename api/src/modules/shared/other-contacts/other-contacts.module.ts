import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { OtherContactsController } from './other-contacts.controller';
import { OtherContactsService } from './other-contacts.service';

@Module({
    imports: [DatabaseModule],
    controllers: [OtherContactsController],
    providers: [OtherContactsService],
    exports: [OtherContactsService],
})
export class OtherContactsModule { }
