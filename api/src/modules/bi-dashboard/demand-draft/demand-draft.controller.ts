import { Controller, Get, Query, Put, Param, ParseIntPipe, UseInterceptors, UploadedFiles, Body, Req, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DemandDraftService } from './demand-draft.service';

const biDashboardMulterConfig = {
    storage: diskStorage({
        destination: './uploads/bi-dashboard',
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `dd-${uniqueSuffix}${ext}`);
        },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
};

@Controller('demand-drafts')
export class DemandDraftController {
    constructor(private readonly demandDraftService: DemandDraftService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.demandDraftService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.demandDraftService.getDashboardCounts();
    }

    @Put('instruments/:id/action')
    @UseInterceptors(FilesInterceptor('files', 20, biDashboardMulterConfig))
    async updateAction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @UploadedFiles() files: Express.Multer.File[],
        @Req() req: any,
    ) {
        if (!body.action) {
            throw new BadRequestException('Action is required');
        }
        return this.demandDraftService.updateAction(id, body, files || [], req.user);
    }
}
