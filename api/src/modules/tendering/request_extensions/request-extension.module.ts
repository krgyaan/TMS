import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { RequestExtensionsController } from './request-extension.controller';
import { RequestExtensionsService } from './request-extension.service';

@Module({
    imports: [DatabaseModule],
    controllers: [RequestExtensionsController],
    providers: [RequestExtensionsService],
    exports: [RequestExtensionsService],
})
export class RequestExtensionsModule { }
