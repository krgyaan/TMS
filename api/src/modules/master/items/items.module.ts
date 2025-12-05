import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ItemsController } from '@/modules/master/items/items.controller';
import { ItemsService } from '@/modules/master/items/items.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ItemsController],
    providers: [ItemsService],
})
export class ItemsModule { }
