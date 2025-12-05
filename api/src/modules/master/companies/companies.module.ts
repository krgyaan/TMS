import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CompaniesController } from '@/modules/master/companies/companies.controller';
import { CompaniesService } from '@/modules/master/companies/companies.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CompaniesController],
    providers: [CompaniesService],
})
export class CompaniesModule { }
