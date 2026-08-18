import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { HappyCallingController } from './happy-calling.controller';
import { HappyCallingService } from './happy-calling.service';

@Module({
    imports: [DatabaseModule],
    controllers: [HappyCallingController],
    providers: [HappyCallingService],
    exports: [HappyCallingService],
})
export class HappyCallingModule {}