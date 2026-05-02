import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { SubmitQueriesController } from './submit-queries.controller';
import { SubmitQueriesService } from './submit-queries.service';
import { EmailModule } from '../../email/email.module';

@Module({
    imports: [DatabaseModule, EmailModule],
    controllers: [SubmitQueriesController],
    providers: [SubmitQueriesService],
    exports: [SubmitQueriesService],
})
export class SubmitQueriesModule { }
