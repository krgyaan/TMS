import { Controller, Get } from '@nestjs/common';
import { VendorOrganizationsService } from './vendor-organizations.service';

@Controller('vendor-organizations')
export class VendorOrganizationsController {
  constructor(
    private readonly vendorOrganizationsService: VendorOrganizationsService,
  ) {}

  @Get()
  async list() {
    return this.vendorOrganizationsService.findAll();
  }
}
