import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    Headers,
    Res,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import * as fs from 'fs';

import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { TrainingService } from './training.service';

const videoMulterConfig = {
    storage: diskStorage({
        destination: './uploads/hrms/training',
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `trn-video-${uniqueSuffix}${ext}`);
        },
    }),
};

@Controller('hrms/training')
export class TrainingController {
    constructor(private readonly service: TrainingService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', videoMulterConfig))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { title: string; description?: string; category: string; completionThreshold?: string },
        @CurrentUser() user: any,
    ) {
        const threshold = body.completionThreshold ? parseInt(body.completionThreshold, 10) : 90;
        return this.service.create(
            body.title,
            body.description,
            body.category,
            threshold,
            file,
            user.sub,
        );
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

        if (!fs.existsSync(videoPath)) {
            throw new NotFoundException('Video file not found on disk');
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;

        if (rangeHeader) {
            // Range request format: bytes=start-end
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
                'Content-Type': 'video/mp4',
            };

            res.writeHead(206, head);
            fileStream.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
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

