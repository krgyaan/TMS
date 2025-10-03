import { Controller, Get } from '@nestjs/common';
import { ItemHeadingsService } from './item-headings.service';

@Controller('item-headings')
export class ItemHeadingsController {
  constructor(private readonly itemHeadingsService: ItemHeadingsService) {}

  @Get()
  async list() {
    return this.itemHeadingsService.findAll();
  }
}
