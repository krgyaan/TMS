import { Module } from '@nestjs/common';
import { QueueModule } from '@/infra/queue/queue.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
    imports: [QueueModule],
    controllers: [TrainingController],
    providers: [TrainingService],
    exports: [TrainingService],
})
export class TrainingModule {}
