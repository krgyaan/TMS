import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { WebsitesController } from './websites.controller';
import { WebsitesService } from './websites.service';

@Module({
    imports: [DatabaseModule],
    controllers: [WebsitesController],
    providers: [WebsitesService],
    exports: [WebsitesService],
})
export class WebsitesModule { }
