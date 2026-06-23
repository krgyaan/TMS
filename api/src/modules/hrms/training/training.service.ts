import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';

import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@/db';
import { trainingVideos } from '@/db/schemas/hrms/training-videos.schema';
import { trainingAssignments } from '@/db/schemas/hrms/training-assignments.schema';
import { trainingWatchHistory } from '@/db/schemas/hrms/training-watch-history.schema';
import { trainingComments } from '@/db/schemas/hrms/training-comments.schema';
import { trainingVideoReactions } from '@/db/schemas/hrms/training-video-reactions.schema';
import { users } from '@/db/schemas/auth/users.schema';
import { userProfiles } from '@/db/schemas/auth/user-profiles.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { designations } from '@/db/schemas/master/designations.schema';

@Injectable()
export class TrainingService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject('VIDEO_PROCESSING_QUEUE') private readonly videoQueue: Queue,
    ) {}

    async create(
        title: string,
        description: string | undefined,
        category: string,
        completionThreshold: number,
        file: Express.Multer.File,
        userId: number,
    ) {
        const videoCode = `TRN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const [newVideo] = await this.db
            .insert(trainingVideos)
            .values({
                videoCode,
                title,
                description,
                filename: file.filename,
                filepath: file.path,
                filesize: file.size,
                status: 'processing',
                storageProvider: 'VPS',
                storageKey: file.filename,
                completionThreshold,
                category,
                uploadedBy: userId,
            })
            .returning();

        // Add job to video processing queue
        await this.videoQueue.add(
            'process-video',
            { videoId: newVideo.id, filepath: file.path },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 10000 },
            },
        );

        return newVideo;
    }

    async findAll() {
        const videosList = await this.db
            .select()
            .from(trainingVideos)
            .orderBy(trainingVideos.createdAt);

        // Fetch all reactions to group them in-memory
        const reactions = await this.db
            .select()
            .from(trainingVideoReactions);

        return videosList.map(video => {
            const videoReactions = reactions.filter(r => r.videoId === video.id);
            const helpful = videoReactions.filter(r => r.reaction.toLowerCase() === 'helpful').length;
            const important = videoReactions.filter(r => r.reaction.toLowerCase() === 'important').length;
            const confusing = videoReactions.filter(r => r.reaction.toLowerCase() === 'confusing').length;

            return {
                ...video,
                reactions: { helpful, important, confusing }
            };
        });
    }

    async togglePublish(id: number) {
        const video = await this.findOne(id);
        const [updated] = await this.db
            .update(trainingVideos)
            .set({ isPublished: !video.isPublished, updatedAt: new Date() })
            .where(eq(trainingVideos.id, id))
            .returning();
        return updated;
    }


    async findOne(id: number) {
        const [video] = await this.db
            .select()
            .from(trainingVideos)
            .where(eq(trainingVideos.id, id))
            .limit(1);

        if (!video) {
            throw new NotFoundException(`Training video with ID ${id} not found`);
        }

        return video;
    }

    async remove(id: number) {
        const video = await this.findOne(id);

        // Delete physical video file
        if (fs.existsSync(video.filepath)) {
            try {
                fs.unlinkSync(video.filepath);
            } catch (err) {
                console.error(`Failed to delete video file at ${video.filepath}:`, err);
            }
        }

        // Delete thumbnail if it exists
        if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
            try {
                fs.unlinkSync(video.thumbnailPath);
            } catch (err) {
                console.error(`Failed to delete thumbnail file at ${video.thumbnailPath}:`, err);
            }
        }

        // Delete assignments
        await this.db
            .delete(trainingAssignments)
            .where(eq(trainingAssignments.videoId, id));

        // Delete watch history
        await this.db
            .delete(trainingWatchHistory)
            .where(eq(trainingWatchHistory.videoId, id));

        // Delete comments
        await this.db
            .delete(trainingComments)
            .where(eq(trainingComments.videoId, id));

        // Delete reactions
        await this.db
            .delete(trainingVideoReactions)
            .where(eq(trainingVideoReactions.videoId, id));

        // Delete DB record
        await this.db
            .delete(trainingVideos)
            .where(eq(trainingVideos.id, id));

        return { success: true, message: `Video ${id} deleted successfully` };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Employee Queries (for Assign Modal)
    // ─────────────────────────────────────────────────────────────────────────
    async getEmployees() {
        const employeesList = await this.db
            .select({
                id: users.id,
                name: users.name,
                dept: teams.name,
                designation: designations.name,
            })
            .from(users)
            .leftJoin(teams, eq(users.team, teams.id))
            .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
            .leftJoin(designations, eq(userProfiles.designationId, designations.id))
            .where(eq(users.isActive, true));

        return employeesList.map(e => ({
            id: e.id,
            name: e.name,
            dept: e.dept || 'General',
            designation: e.designation || 'Staff',
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Assignments Management
    // ─────────────────────────────────────────────────────────────────────────
    async assignVideo(videoId: number, userIds: number[], assignedByUserId: number) {
        if (!userIds || userIds.length === 0) return { success: true, message: 'No users provided' };

        const values = userIds.map(userId => ({
            videoId,
            userId,
            assignedBy: assignedByUserId,
            status: 'Assigned' as const,
        }));

        // Find existing assignments to filter out duplicates
        const existing = await this.db
            .select()
            .from(trainingAssignments)
            .where(
                and(
                    eq(trainingAssignments.videoId, videoId),
                    inArray(trainingAssignments.userId, userIds)
                )
            );

        const existingUserIds = existing.map(e => e.userId);
        const toInsert = values.filter(v => !existingUserIds.includes(v.userId));

        if (toInsert.length > 0) {
            await this.db.insert(trainingAssignments).values(toInsert);
        }

        return { success: true, count: toInsert.length };
    }

    async getLearnersProgress() {
        const rows = await this.db
            .select({
                id: trainingAssignments.id,
                userId: trainingAssignments.userId,
                userName: users.name,
                dept: teams.name,
                videoTitle: trainingVideos.title,
                progress: trainingWatchHistory.completionPct,
                status: trainingAssignments.status,
                completedAt: trainingWatchHistory.completedAt,
            })
            .from(trainingAssignments)
            .innerJoin(users, eq(trainingAssignments.userId, users.id))
            .innerJoin(trainingVideos, eq(trainingAssignments.videoId, trainingVideos.id))
            .leftJoin(teams, eq(users.team, teams.id))
            .leftJoin(
                trainingWatchHistory,
                and(
                    eq(trainingWatchHistory.userId, trainingAssignments.userId),
                    eq(trainingWatchHistory.videoId, trainingAssignments.videoId)
                )
            )
            .orderBy(trainingAssignments.createdAt);

        return rows.map(r => ({
            id: r.id,
            userName: r.userName,
            dept: r.dept || 'General',
            videoTitle: r.videoTitle,
            progress: r.progress ? Math.round(parseFloat(r.progress)) : 0,
            status: r.status as 'Assigned' | 'In Progress' | 'Completed',
            completedAt: r.completedAt ? r.completedAt.toISOString().split('T')[0] : null,
        }));
    }

    async getEmployeeAssignments(userId: number) {
        const rows = await this.db
            .select({
                assignmentId: trainingAssignments.id,
                id: trainingVideos.id,
                title: trainingVideos.title,
                description: trainingVideos.description,
                category: trainingVideos.category,
                durationSeconds: trainingVideos.durationSeconds,
                thumbnailPath: trainingVideos.thumbnailPath,
                status: trainingAssignments.status,
                progress: trainingWatchHistory.completionPct,
                isCompleted: trainingWatchHistory.isCompleted,
            })
            .from(trainingAssignments)
            .innerJoin(trainingVideos, eq(trainingAssignments.videoId, trainingVideos.id))
            .leftJoin(
                trainingWatchHistory,
                and(
                    eq(trainingWatchHistory.userId, userId),
                    eq(trainingWatchHistory.videoId, trainingVideos.id)
                )
            )
            .where(eq(trainingAssignments.userId, userId));

        return rows.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description || '',
            category: r.category || 'General',
            duration: r.durationSeconds ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : '0m 0s',
            progress: r.progress ? Math.round(parseFloat(r.progress)) : 0,
            status: r.status as 'Assigned' | 'In Progress' | 'Completed',
            videoUrl: `/api/v1/hrms/training/${r.id}/stream`,
            thumbnailPath: r.thumbnailPath ?? null,
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Watch History / Progress Logging
    // ─────────────────────────────────────────────────────────────────────────
    async logProgress(
        videoId: number,
        userId: number,
        lastPositionSecs: number,
        totalWatchSecs: number,
        completionPct: number,
    ) {
        const video = await this.findOne(videoId);
        const threshold = video.completionThreshold || 90;
        const isNowCompleted = completionPct >= threshold;

        const [history] = await this.db
            .select()
            .from(trainingWatchHistory)
            .where(
                and(
                    eq(trainingWatchHistory.userId, userId),
                    eq(trainingWatchHistory.videoId, videoId)
                )
            )
            .limit(1);

        let record;
        if (history) {
            const updates: any = {
                lastPositionSecs,
                totalWatchSecs: history.totalWatchSecs + totalWatchSecs,
                completionPct: completionPct.toString(),
                lastWatchedAt: new Date(),
                updatedAt: new Date(),
            };
            if (isNowCompleted && !history.isCompleted) {
                updates.isCompleted = true;
                updates.completedAt = new Date();
            }
            [record] = await this.db
                .update(trainingWatchHistory)
                .set(updates)
                .where(eq(trainingWatchHistory.id, history.id))
                .returning();
        } else {
            const insertData: any = {
                userId,
                videoId,
                lastPositionSecs,
                totalWatchSecs,
                watchCount: 1,
                completionPct: completionPct.toString(),
                firstWatchedAt: new Date(),
                lastWatchedAt: new Date(),
                isCompleted: isNowCompleted,
                completedAt: isNowCompleted ? new Date() : null,
            };
            [record] = await this.db
                .insert(trainingWatchHistory)
                .values(insertData)
                .returning();
        }

        // Update the assignment status if it exists
        const nextStatus = record.isCompleted ? 'Completed' : 'In Progress';
        await this.db
            .update(trainingAssignments)
            .set({ status: nextStatus, updatedAt: new Date() })
            .where(
                and(
                    eq(trainingAssignments.userId, userId),
                    eq(trainingAssignments.videoId, videoId)
                )
            );

        return record;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reactions
    // ─────────────────────────────────────────────────────────────────────────
    async addReaction(videoId: number, userId: number, reaction: string) {
        // Delete any existing reaction from this user for this video
        await this.db
            .delete(trainingVideoReactions)
            .where(
                and(
                    eq(trainingVideoReactions.userId, userId),
                    eq(trainingVideoReactions.videoId, videoId)
                )
            );

        return this.db
            .insert(trainingVideoReactions)
            .values({
                videoId,
                userId,
                reaction,
            })
            .returning();
    }

    async removeReaction(videoId: number, userId: number, reaction: string) {
        await this.db
            .delete(trainingVideoReactions)
            .where(
                and(
                    eq(trainingVideoReactions.userId, userId),
                    eq(trainingVideoReactions.videoId, videoId),
                    eq(trainingVideoReactions.reaction, reaction)
                )
            );
        return { success: true };
    }

    async getReactions(videoId: number, userId: number) {
        const reactions = await this.db
            .select()
            .from(trainingVideoReactions)
            .where(eq(trainingVideoReactions.videoId, videoId));

        const counts = { helpful: 0, important: 0, confusing: 0 };
        let myReaction: string | null = null;

        for (const r of reactions) {
            const reactKey = r.reaction.toLowerCase() as 'helpful' | 'important' | 'confusing';
            if (reactKey === 'helpful' || reactKey === 'important' || reactKey === 'confusing') {
                counts[reactKey]++;
            }
            if (r.userId === userId) {
                myReaction = r.reaction;
            }
        }

        return { ...counts, myReaction };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Comments
    // ─────────────────────────────────────────────────────────────────────────
    async addComment(videoId: number, userId: number, body: string, parentCommentId?: number) {
        let depthLevel = 0;
        if (parentCommentId) {
            const [parent] = await this.db
                .select()
                .from(trainingComments)
                .where(eq(trainingComments.id, parentCommentId))
                .limit(1);
            if (parent) {
                depthLevel = parent.depthLevel + 1;
            }
        }

        return this.db
            .insert(trainingComments)
            .values({
                videoId,
                userId,
                body,
                parentCommentId: parentCommentId || null,
                depthLevel,
            })
            .returning();
    }

    async getComments(videoId: number) {
        const rows = await this.db
            .select({
                id: trainingComments.id,
                videoId: trainingComments.videoId,
                userId: trainingComments.userId,
                userName: users.name,
                parentCommentId: trainingComments.parentCommentId,
                depthLevel: trainingComments.depthLevel,
                body: trainingComments.body,
                createdAt: trainingComments.createdAt,
            })
            .from(trainingComments)
            .innerJoin(users, eq(trainingComments.userId, users.id))
            .where(eq(trainingComments.videoId, videoId))
            .orderBy(trainingComments.createdAt);

        const comments: any[] = [];
        const commentsById: Record<number, any> = {};

        // To format friendly times:
        const timeAgo = (date: Date) => {
            const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
            let interval = Math.floor(seconds / 31536000);
            if (interval >= 1) return interval === 1 ? '1 year ago' : `${interval} years ago`;
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) return interval === 1 ? '1 month ago' : `${interval} months ago`;
            interval = Math.floor(seconds / 86400);
            if (interval >= 1) return interval === 1 ? '1 day ago' : `${interval} days ago`;
            interval = Math.floor(seconds / 3600);
            if (interval >= 1) return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
            interval = Math.floor(seconds / 60);
            if (interval >= 1) return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
            return 'Just now';
        };

        for (const r of rows) {
            const c = {
                id: r.id,
                userName: r.userName,
                body: r.body,
                createdAt: timeAgo(r.createdAt),
                replies: [] as any[],
            };
            commentsById[r.id] = c;

            if (r.parentCommentId) {
                const parent = commentsById[r.parentCommentId];
                if (parent) {
                    parent.replies.push(c);
                } else {
                    comments.push(c);
                }
            } else {
                comments.push(c);
            }
        }

        return comments;
    }
}

