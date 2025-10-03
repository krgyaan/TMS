import { Controller, Get } from '@nestjs/common';
import { LoanPartiesService } from './loan-parties.service';

@Controller('loan-parties')
export class LoanPartiesController {
  constructor(private readonly loanPartiesService: LoanPartiesService) {}

  @Get()
  async list() {
    return this.loanPartiesService.findAll();
  }
}
