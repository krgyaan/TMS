import { Body, Controller, Get, Param, ParseIntPipe, Post, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { WoAcceptanceService } from './wo-acceptance.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { WoAcceptanceDecisionSchema, type WoAcceptanceDecisionDto } from './dto/wo-acceptance.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('wo-acceptance')
export class WoAcceptanceController {
  constructor(private readonly woAcceptanceService: WoAcceptanceService) {}

  @Get(':woDetailId')
  async getDetails(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.woAcceptanceService.getAcceptanceDetails(woDetailId);
  }

  @Post(':woDetailId/decision')
  @HttpCode(HttpStatus.OK)
  async submitDecision(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @Body() body: any,
    @CurrentUser() user: ValidatedUser,
  ) {
    const parsed = WoAcceptanceDecisionSchema.parse(body) as WoAcceptanceDecisionDto;
    return this.woAcceptanceService.processDecision(woDetailId, parsed, user.sub);
  }

  @Post(':woDetailId/upload-signed')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/wo-documents',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadSignedWo(
    @Param('woDetailId', ParseIntPipe) woDetailId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      filePath: `wo-documents/${file.filename}`,
      originalName: file.originalname,
    };
  }
}
