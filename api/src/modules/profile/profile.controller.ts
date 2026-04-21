import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';

// ─── Multer Config ────────────────────────────────────────────────────────────

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

const documentStorage = diskStorage({
  destination: './uploads/hrms/employee-documents',
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const documentMulter = {
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `File type not allowed. Accepted: ${ALLOWED_EXT.join(', ')}`,
        ),
        false,
      );
    }
  },
};

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile/me
   */
  @Get('me')
  async getMyProfile(@Req() req: any) {
    return this.profileService.getMyProfile(req.user.id);
  }

  /**
   * POST /profile/documents
   * Upload a new employee document (multipart/form-data)
   * Fields: file, docType, docCategory, issueDate?, expiryDate?
   */
  @Post('documents')
  @UseInterceptors(FileInterceptor('file', documentMulter))
  async uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!body.docType) {
      throw new BadRequestException('docType is required');
    }
    if (!body.docCategory) {
      throw new BadRequestException('docCategory is required');
    }

    return this.profileService.uploadDocument(req.user.id, file, {
      docType: body.docType,
      docCategory: body.docCategory,
      issueDate: body.issueDate || null,
      expiryDate: body.expiryDate || null,
    });
  }

  /**
   * PATCH /profile/documents/:id
   * Re-upload a rejected document (multipart/form-data)
   * Fields: file, issueDate?, expiryDate?
   */
  @Patch('documents/:id')
  @UseInterceptors(FileInterceptor('file', documentMulter))
  async reuploadDocument(
    @Req() req: any,
    @Param('id', ParseIntPipe) docId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.profileService.reuploadDocument(req.user.id, docId, file, {
      issueDate: body.issueDate || null,
      expiryDate: body.expiryDate || null,
    });
  }

  /**
   * DELETE /profile/documents/:id
   * Delete an uploaded document
   */
  @Delete('documents/:id')
  async deleteDocument(
    @Req() req: any,
    @Param('id', ParseIntPipe) docId: number,
  ) {
    await this.profileService.deleteDocument(req.user.id, docId);
    return { success: true };
  }
}

