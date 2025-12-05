import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { WebsitesController } from '@/modules/master/websites/websites.controller';
import { WebsitesService } from '@/modules/master/websites/websites.service';

@Module({
    imports: [DatabaseModule],
    controllers: [WebsitesController],
    providers: [WebsitesService],
    exports: [WebsitesService],
})
export class WebsitesModule { }
