import { Controller, Get, Post, Param, Body, Query, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';
import type { CreateCashFlowDto } from './dto/cash-flow.dto';

@Controller('cash-flows')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) body: CreateCashFlowDto) {
    return this.cashFlowService.create(body);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: number, @Query() filters?: { eventType?: string }) {
    return this.cashFlowService.getByProject(projectId, filters);
  }

  @Get('project/:projectId/summary')
  async summary(@Param('projectId') projectId: number) {
    return this.cashFlowService.getSummary(projectId);
  }
}