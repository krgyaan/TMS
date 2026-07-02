import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseInterceptors, UploadedFiles, Req, BadRequestException } from '@nestjs/common';
import { TenderResultService } from '@/modules/tendering/tender-result/tender-result.service';
import type { ResultDashboardType } from '@/modules/tendering/types/shared.types';
import type { UploadResultDto, UploadChangeStatusResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { UploadChangeStatusResultSchema } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

//defining the multer config
const multerConfig = {
    storage: diskStorage({
        destination : './uploads/tendering/result-screenshots',
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `imp-${uniqueSuffix}${ext}`);
        },
    }),
    limits: {
        fileSize : 10 * 1024 * 1024,
    }
}

@Controller('tender-results')
export class TenderResultController {
    constructor(private readonly tenderResultService: TenderResultService) { }

    @Get('dashboard')
    getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: ResultDashboardType,
        @Query('teamId') teamId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.tenderResultService.getDashboardData(user, parseNumber(teamId), tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.tenderResultService.getCounts(user, parseNumber(teamId));
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.findByTenderId(tenderId);
    }

    @Get(':id/ra-details')
    getLinkedRaDetails(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.getLinkedRaDetails(id);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.findById(id);
    }

    @Post('create/:tenderId')
    createForTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.createForTender(tenderId);
    }

    @Post('change-status/:tenderId')
    changeTenderResult(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @CurrentUser() user: any,
        @Body() dto: UploadChangeStatusResultDto
    ){
        //calling the service function to cancel the tender
        const result = this.tenderResultService.changeTenderResult(tenderId , user, dto);
        return  result;
    }

    @Post('upload/:tenderId')
    async uploadResultByTenderId(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() dto: UploadResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        const existingResult = await this.tenderResultService.findByTenderId(tenderId);
        let resultId: number | null = null;
        
        if (existingResult) {
            resultId = existingResult.id;
        } else {
            const { id } = await this.tenderResultService.getOrCreateForTender(tenderId);
            resultId = id;
        }
        
        return this.tenderResultService.uploadResult(resultId, tenderId, dto, user.sub);
    }

    @Post(':id/upload-result')
    async uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        const result = await this.tenderResultService.findById(id);
        return this.tenderResultService.uploadResult(id, result.tenderId, dto, user.sub);
    }
}
