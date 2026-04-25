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
   * PATCH /profile/me
   * Allows the employee to update their own basic details 
   * (writes to onboardingProfiles if onboarding is active)
   */
  @Patch('me')
  async updateMyProfile(@Req() req: any, @Body() body: any) {
    return this.profileService.updateMyProfile(req.user.id, body);
  }

  // ─── Education Endpoints ──────────────────────────────────────────────────

  @Post('education')
  async addEducation(@Req() req: any, @Body() body: any) {
    return this.profileService.addEducation(req.user.id, body);
  }

  @Patch('education/:id')
  async updateEducation(@Req() req: any, @Param('id', ParseIntPipe) eduId: number, @Body() body: any) {
    return this.profileService.updateEducation(req.user.id, eduId, body);
  }

  @Delete('education/:id')
  async deleteEducation(@Req() req: any, @Param('id', ParseIntPipe) eduId: number) {
    await this.profileService.deleteEducation(req.user.id, eduId);
    return { success: true };
  }

  // ─── Work Experience Endpoints ────────────────────────────────────────────

  @Post('experience')
  async addExperience(@Req() req: any, @Body() body: any) {
    return this.profileService.addExperience(req.user.id, body);
  }

  @Patch('experience/:id')
  async updateExperience(@Req() req: any, @Param('id', ParseIntPipe) expId: number, @Body() body: any) {
    return this.profileService.updateExperience(req.user.id, expId, body);
  }

  @Delete('experience/:id')
  async deleteExperience(@Req() req: any, @Param('id', ParseIntPipe) expId: number) {
    await this.profileService.deleteExperience(req.user.id, expId);
    return { success: true };
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

