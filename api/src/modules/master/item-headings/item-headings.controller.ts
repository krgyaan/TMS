import { Controller, Get } from '@nestjs/common';
import { ItemHeadingsService } from '@/modules/master/item-headings/item-headings.service';

@Controller('item-headings')
export class ItemHeadingsController {
  constructor(private readonly itemHeadingsService: ItemHeadingsService) {}

  @Get()
  async list() {
    return this.itemHeadingsService.findAll();
  }
}
