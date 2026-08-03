import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import type { Request } from 'express';
import * as fs from 'fs';
import { access, stat } from 'fs/promises';
import { extname, resolve } from 'path';

import { CurrentUser } from '@/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { TrainingService } from './training.service';
import { TrainingUploadService } from './training-upload.service';

@Controller('hrms/training')
export class TrainingController {
    constructor(
        private readonly service: TrainingService,
        private readonly uploadService: TrainingUploadService,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Chunked video upload (raw binary chunks, no multipart/multer)
    // ─────────────────────────────────────────────────────────────────────────

    @Post('upload/init')
    @HttpCode(HttpStatus.CREATED)
    async initUpload(@Body() body: { fileSize: string; originalName: string }) {
        return this.uploadService.init({
            fileSize: Number(body.fileSize),
            originalName: body.originalName,
        });
    }

    @Post('upload/chunk/:uploadId')
    async uploadChunk(
        @Param('uploadId') uploadId: string,
        @Headers('x-chunk-index') chunkIndex: string,
        @Req() req: Request,
    ) {
        const index = Number(chunkIndex);
        if (!Number.isInteger(index) || index < 0) {
            throw new BadRequestException('Invalid x-chunk-index header');
        }
        return this.uploadService.appendChunk(uploadId, index, req);
    }

    @Post('upload/finalize/:uploadId')
    async uploadFinalize(@Param('uploadId') uploadId: string) {
        return this.uploadService.finalize(uploadId);
    }

    @Delete('upload/:uploadId')
    async abortUpload(@Param('uploadId') uploadId: string) {
        await this.uploadService.abort(uploadId);
        return { success: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Data storing — create() references an already-uploaded file
    // ─────────────────────────────────────────────────────────────────────────

    @Post('videos')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: {
            uploadId: string;
            title: string;
            description?: string;
            category: string;
            completionThreshold?: string;
        },
        @CurrentUser() user: any,
    ) {
        const file = await this.uploadService.resolveUploadedFile(body.uploadId);
        const threshold = body.completionThreshold ? parseInt(body.completionThreshold, 10) : 90;

        const video = await this.service.create(
            body.title,
            body.description,
            body.category,
            threshold,
            file,
            user.sub,
        );

        // Session record no longer needed once the DB row exists.
        await this.uploadService.complete(body.uploadId).catch(() => undefined);

        return video;
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Post(':id/toggle-publish')
    async togglePublish(@Param('id', ParseIntPipe) id: number) {
        return this.service.togglePublish(id);
    }


    @Public()
    @Get(':id/stream')
    async stream(
        @Param('id', ParseIntPipe) id: number,
        @Headers('range') rangeHeader: string,
        @Res() res: any,
    ) {
        const video = await this.service.findOne(id);
        const videoPath = resolve(video.filepath);

        try {
            await access(videoPath);
        } catch {
            throw new NotFoundException('Video file not found on disk');
        }

        const { size: fileSize } = await stat(videoPath);

        const ext = extname(videoPath).toLowerCase();
        const contentType: Record<string, string> = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.webm': 'video/webm',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
        };
        const mimeType = contentType[ext] || 'video/mp4';

        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize) {
                res.status(416).header('Content-Range', `bytes */${fileSize}`).send();
                return;
            }

            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            };

            res.writeHead(206, head);
            fileStream.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    @Get('employees')
    async getEmployees() {
        return this.service.getEmployees();
    }

    @Post('assignments')
    async assign(
        @Body() body: { videoId: number; userIds: number[] },
        @CurrentUser() user: any,
    ) {
        return this.service.assignVideo(body.videoId, body.userIds, user.sub);
    }

    @Get('assignments')
    async getLearnersProgress() {
        return this.service.getLearnersProgress();
    }

    @Get('my-assignments')
    async getEmployeeAssignments(@CurrentUser() user: any) {
        return this.service.getEmployeeAssignments(user.sub);
    }

    @Post('progress')
    async logProgress(
        @Body() body: { videoId: number; lastPositionSecs: number; totalWatchSecs: number; completionPct: number },
        @CurrentUser() user: any,
    ) {
        return this.service.logProgress(
            body.videoId,
            user.sub,
            body.lastPositionSecs,
            body.totalWatchSecs,
            body.completionPct,
        );
    }

    @Post('videos/:id/reactions')
    async addReaction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { reaction: string },
        @CurrentUser() user: any,
    ) {
        return this.service.addReaction(id, user.sub, body.reaction);
    }

    @Delete('videos/:id/reactions')
    async removeReaction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { reaction: string },
        @CurrentUser() user: any,
    ) {
        return this.service.removeReaction(id, user.sub, body.reaction);
    }

    @Get('videos/:id/reactions')
    async getReactions(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: any,
    ) {
        return this.service.getReactions(id, user.sub);
    }

    @Post('videos/:id/comments')
    async addComment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { body: string; parentCommentId?: number },
        @CurrentUser() user: any,
    ) {
        return this.service.addComment(id, user.sub, body.body, body.parentCommentId);
    }

    @Get('videos/:id/comments')
    async getComments(@Param('id', ParseIntPipe) id: number) {
        return this.service.getComments(id);
    }
}

