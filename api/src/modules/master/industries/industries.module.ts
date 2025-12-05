import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { IndustriesController } from '@/modules/master/industries/industries.controller';
import { IndustriesService } from '@/modules/master/industries/industries.service';

@Module({
    imports: [DatabaseModule],
    controllers: [IndustriesController],
    providers: [IndustriesService],
    exports: [IndustriesService],
})
export class IndustriesModule { }
