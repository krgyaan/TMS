import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { SubmitQueriesController } from './submit-queries.controller';
import { SubmitQueriesService } from './submit-queries.service';

@Module({
    imports: [DatabaseModule],
    controllers: [SubmitQueriesController],
    providers: [SubmitQueriesService],
    exports: [SubmitQueriesService],
})
export class SubmitQueriesModule { }
