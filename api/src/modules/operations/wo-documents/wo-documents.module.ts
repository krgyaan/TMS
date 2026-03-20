import { Module } from '@nestjs/common';
import { WoDocumentsController } from './wo-documents.controller';
import { WoDocumentsService } from './wo-documents.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WoDocumentsController],
  providers: [WoDocumentsService],
  exports: [WoDocumentsService],
})
export class WoDocumentsModule {}
