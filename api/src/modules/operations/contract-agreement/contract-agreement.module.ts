import { Module } from '@nestjs/common';
import { ContractAgreementService } from './contract-agreement.service';
import { ContractAgreementController } from './contract-agreement.controller';

@Module({
  providers: [ContractAgreementService],
  controllers: [ContractAgreementController]
})
export class ContractAgreementModule {}
