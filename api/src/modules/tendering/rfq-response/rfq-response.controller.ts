import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { RfqResponseService } from './rfq-response.service';
import type { CreateRfqResponseBodyDto } from './dto/rfq-response.dto';

@Controller('rfqs')
export class RfqResponseController {
    constructor(private readonly rfqResponseService: RfqResponseService) {}

    @Get('responses')
    async getAllResponses() {
        return this.rfqResponseService.findAll();
    }

    @Get('responses/:responseId')
    async getResponseById(@Param('responseId', ParseIntPipe) responseId: number) {
        return this.rfqResponseService.findById(responseId);
    }

    @Get(':rfqId/responses')
    async getResponsesByRfqId(@Param('rfqId', ParseIntPipe) rfqId: number) {
        return this.rfqResponseService.findByRfqId(rfqId);
    }

    @Post(':rfqId/responses')
    @HttpCode(HttpStatus.CREATED)
    async createResponse(
        @Param('rfqId', ParseIntPipe) rfqId: number,
        @Body() body: CreateRfqResponseBodyDto,
    ) {
        return this.rfqResponseService.create(rfqId, body);
    }
}
