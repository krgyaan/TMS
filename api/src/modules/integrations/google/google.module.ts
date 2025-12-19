import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@db/database.module';
import { GoogleController } from '@/modules/integrations/google/google.controller';
import { GoogleService } from '@/modules/integrations/google/google.service';
import { GoogleDriveService } from '@/modules/integrations/google/google-drive.service';
import googleConfig from '@config/google.config';
import googleDriveConfig from '@config/google-drive.config';

@Module({
    imports: [
        ConfigModule.forFeature(googleConfig),
        ConfigModule.forFeature(googleDriveConfig),
        DatabaseModule,
    ],
    controllers: [GoogleController],
    providers: [GoogleService, GoogleDriveService],
    exports: [GoogleService, GoogleDriveService],
})
export class GoogleIntegrationModule { }
