import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { LoanAdvanceService } from './loan-advance.service';
import { CreateLoanAdvanceDto, createLoanAdvanceSchema, UpdateLoanAdvanceDto, updateLoanAdvanceSchema, loanAdvanceQuerySchema, LoanClosureDto, loanClosureSchema, CreateLoanBankContactDto,  createLoanBankContactSchema, UpdateLoanBankContactDto, updateLoanBankContactSchema, CreateDueEmiDto, createDueEmiSchema, UpdateDueEmiDto, updateDueEmiSchema, CreateTdsRecoveryDto, createTdsRecoverySchema, UpdateTdsRecoveryDto, updateTdsRecoverySchema } from './dto/loan-advance.dto';

@Controller('loan-advances')
export class LoanAdvanceController {
  constructor(private readonly loanAdvanceService: LoanAdvanceService) {}

  @Get()
  async listLoans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('loanPartyName') loanPartyName?: string,
    @Query('typeOfLoan') typeOfLoan?: string,
    @Query('loanCloseStatus') loanCloseStatus?: string
  ) {
    const filters = loanAdvanceQuerySchema.parse({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
      search,
      loanPartyName,
      typeOfLoan,
      loanCloseStatus,
    });
    return this.loanAdvanceService.findAllLoans(filters);
  }

  @Get(':id')
  async getLoanById(@Param('id', ParseIntPipe) id: number) {
    return this.loanAdvanceService.findLoanById(id);
  }

  @Get(':id/full')
  async getLoanFullDetails(@Param('id', ParseIntPipe) id: number) {
    return this.loanAdvanceService.findLoanFullDetails(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLoan(@Body() body: unknown) {
    const parsed = createLoanAdvanceSchema.parse(body) as CreateLoanAdvanceDto;
    return this.loanAdvanceService.createLoan(parsed);
  }

  @Patch(':id')
  async updateLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown
  ) {
    const parsed = updateLoanAdvanceSchema.parse(body) as UpdateLoanAdvanceDto;
    return this.loanAdvanceService.updateLoan(id, parsed);
  }

  @Post(':id/close')
  async closeLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown
  ) {
    const parsed = loanClosureSchema.parse(body) as LoanClosureDto;
    return this.loanAdvanceService.closeLoan(id, parsed);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLoan(@Param('id', ParseIntPipe) id: number) {
    await this.loanAdvanceService.deleteLoan(id);
  }

  // ===================== BANK CONTACTS =====================

  @Get(':loanId/contacts')
  async listContacts(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanAdvanceService.findContactsByLoanId(loanId);
  }

  @Post(':loanId/contacts')
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Body() body: unknown
  ) {
    const parsed = createLoanBankContactSchema.parse({
      ...body as object,
      loanId,
    }) as CreateLoanBankContactDto;
    return this.loanAdvanceService.createContact(parsed);
  }

  @Patch('contacts/:id')
  async updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown
  ) {
    const parsed = updateLoanBankContactSchema.parse(body) as UpdateLoanBankContactDto;
    return this.loanAdvanceService.updateContact(id, parsed);
  }

  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContact(@Param('id', ParseIntPipe) id: number) {
    await this.loanAdvanceService.deleteContact(id);
  }

  // ===================== DUE EMIS =====================

  @Get(':loanId/emis')
  async listEmis(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanAdvanceService.findEmisByLoanId(loanId);
  }

  @Post(':loanId/emis')
  @HttpCode(HttpStatus.CREATED)
  async createEmi(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Body() body: unknown
  ) {
    const parsed = createDueEmiSchema.parse({
      ...body as object,
      loanId,
    }) as CreateDueEmiDto;
    return this.loanAdvanceService.createEmi(parsed);
  }

  @Patch('emis/:id')
  async updateEmi(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown
  ) {
    const parsed = updateDueEmiSchema.parse(body) as UpdateDueEmiDto;
    return this.loanAdvanceService.updateEmi(id, parsed);
  }

  @Delete('emis/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmi(@Param('id', ParseIntPipe) id: number) {
    await this.loanAdvanceService.deleteEmi(id);
  }

  // ===================== TDS FOLLOWUPS =====================

  @Get(':loanId/tds-followups')
  async listFollowups(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanAdvanceService.findFollowupsByLoanId(loanId);
  }

  @Delete('tds-followups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFollowup(@Param('id', ParseIntPipe) id: number) {
    await this.loanAdvanceService.deleteFollowup(id);
  }

  // ===================== TDS RECOVERIES =====================

  @Get(':loanId/tds-recoveries')
  async listRecoveries(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanAdvanceService.findRecoveriesByLoanId(loanId);
  }

  @Post(':loanId/tds-recoveries')
  @HttpCode(HttpStatus.CREATED)
  async createRecovery(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Body() body: unknown
  ) {
    const parsed = createTdsRecoverySchema.parse({
      ...body as object,
      loanId,
    }) as CreateTdsRecoveryDto;
    return this.loanAdvanceService.createRecovery(parsed);
  }

  @Patch('tds-recoveries/:id')
  async updateRecovery(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown
  ) {
    const parsed = updateTdsRecoverySchema.parse(body) as UpdateTdsRecoveryDto;
    return this.loanAdvanceService.updateRecovery(id, parsed);
  }

  @Delete('tds-recoveries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecovery(@Param('id', ParseIntPipe) id: number) {
    await this.loanAdvanceService.deleteRecovery(id);
  }

  // ===================== TDS RECOVERY FOLLOWUP COMBINED =====================

  @Get(':loanId/tds-recovery-followup')
  async getTdsRecoveryFollowup(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanAdvanceService.getTdsRecoveryFollowup(loanId);
  }
}
