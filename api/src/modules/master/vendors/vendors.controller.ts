import { Controller, Get } from '@nestjs/common';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  async list() {
    return this.vendorsService.findAll();
  }
}
