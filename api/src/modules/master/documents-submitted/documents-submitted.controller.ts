import { Controller, Get } from '@nestjs/common';
import { DocumentsSubmittedService } from './documents-submitted.service';

@Controller('documents-submitted')
export class DocumentsSubmittedController {
  constructor(private readonly documentsSubmittedService: DocumentsSubmittedService) {}

  @Get()
  async list() {
    return this.documentsSubmittedService.findAll();
  }
}
