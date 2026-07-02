import { Controller, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ContractAgreementService } from './contract-agreement.service';
import { SaveContractAgreementSchema } from './dto/contract-agreement.dto';
import type { SaveContractAgreementDto } from './dto/contract-agreement.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('contract-agreement')
@UseGuards(JwtAuthGuard)
export class ContractAgreementController {
  constructor(private readonly contractAgreementService: ContractAgreementService) {}

      @Get('dashboard')
      async getDashboard(
          @Query('tab') tab?: 'uploaded' | 'not_uploaded',
          @Query('page') page?: string,
          @Query('limit') limit?: string,
          @Query('sortBy') sortBy?: string,
          @Query('sortOrder') sortOrder?: 'asc' | 'desc',
          @Query('search') search?: string,
          @CurrentUser() user?: ValidatedUser,
          @Query('teamId') teamId?: string,
      ) {
          const parseNumber = (v?: string): number | undefined => {
              if (!v) return undefined;
              const num = parseInt(v, 10);
              return Number.isNaN(num) ? undefined : num;
          };
          const result = await this.contractAgreementService.getDashboardData(tab, {
              page: page ? parseInt(page, 10) : undefined,
              limit: limit ? parseInt(limit, 10) : undefined,
              sortBy,
              sortOrder,
              search,
          }, user, parseNumber(teamId));

          return result;
      }

      @Get('dashboard/counts')
      getDashboardCounts(
          @CurrentUser() user?: ValidatedUser,
          @Query('teamId') teamId?: string,
      ) {
          const parseNumber = (v?: string): number | undefined => {
              if (!v) return undefined;
              const num = parseInt(v, 10);
              return Number.isNaN(num) ? undefined : num;
          };
          return this.contractAgreementService.getDashboardCounts(user, parseNumber(teamId));
      }

  @Get('wo-detail/:woDetailId')
  async getByWoDetailId(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.contractAgreementService.getByWoDetailId(woDetailId);
  }

  @Patch()
  async saveContractAgreement(
    @CurrentUser() user: ValidatedUser,
    @Body() body: unknown,
  ) {
    const dto = SaveContractAgreementSchema.parse(body) as SaveContractAgreementDto;
    return this.contractAgreementService.saveContractAgreement(user.sub, dto);
  }
}
