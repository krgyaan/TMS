import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@db/database.module';
import { GoogleController } from '@/modules/integrations/google/google.controller';
import { GoogleService } from '@/modules/integrations/google/google.service';

@Module({
    imports: [ConfigModule, DatabaseModule],
    controllers: [GoogleController],
    providers: [GoogleService],
    exports: [GoogleService],
})
export class GoogleIntegrationModule { }
