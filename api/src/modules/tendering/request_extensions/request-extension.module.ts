import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { RequestExtensionsController } from './request-extension.controller';
import { RequestExtensionsService } from './request-extension.service';
import { EmailModule } from '../../email/email.module';

@Module({
    imports: [DatabaseModule, EmailModule],
    controllers: [RequestExtensionsController],
    providers: [RequestExtensionsService],
    exports: [RequestExtensionsService],
})
export class RequestExtensionsModule { }
