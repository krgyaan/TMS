import { BaseApiService } from './base.service';

export interface VideoCourse {
    id: number;
    videoCode: string;
    title: string;
    description: string | null;
    filename: string;
    filepath: string;
    filesize: number;
    durationSeconds: number | null;
    resolution: string | null;
    thumbnailPath: string | null;
    status: 'processing' | 'ready' | 'failed';
    storageProvider: string;
    storageKey: string;
    completionThreshold: number;
    isPublished: boolean;
    uploadedBy: number;
    createdAt: string;
    updatedAt: string;
    duration?: string; // formatted duration
    progress?: number; // employee's progress
    videoUrl?: string; // stream url
}

export interface Employee {
    id: number;
    name: string;
    dept: string;
    designation: string;
}

export interface LearnerProgress {
    id: number;
    userName: string;
    dept: string;
    videoTitle: string;
    progress: number;
    status: 'Assigned' | 'In Progress' | 'Completed';
    completedAt: string | null;
}

export interface CommentReply {
    id: number;
    userName: string;
    body: string;
    createdAt: string;
    profilePhoto?: string | null;
}

export interface Comment {
    id: number;
    userName: string;
    body: string;
    createdAt: string;
    replies: CommentReply[];
    profilePhoto?: string | null;
}

export interface Reactions {
    helpful: number;
    important: number;
    confusing: number;
    myReaction: string | null;
}

export class TrainingApiService extends BaseApiService {
    constructor() {
        super('/hrms/training');
    }

    async getAll(): Promise<VideoCourse[]> {
        return this.get<VideoCourse[]>();
    }

    async togglePublish(id: number): Promise<VideoCourse> {
        return this.post<VideoCourse, any>(`/${id}/toggle-publish`, {});
    }


    async upload(formData: FormData, extraConfig?: Record<string, any>): Promise<VideoCourse> {
        return this.post<VideoCourse, FormData>('/upload', formData, extraConfig);
    }

    async remove(id: number): Promise<{ success: boolean; message: string }> {
        return this.delete<{ success: boolean; message: string }>(`/${id}`);
    }

    async getEmployees(): Promise<Employee[]> {
        return this.get<Employee[]>('/employees');
    }

    async assignVideo(videoId: number, userIds: number[]): Promise<{ success: boolean; count: number }> {
        return this.post<{ success: boolean; count: number }, { videoId: number; userIds: number[] }>('/assignments', { videoId, userIds });
    }

    async getLearnersProgress(): Promise<LearnerProgress[]> {
        return this.get<LearnerProgress[]>('/assignments');
    }

    async getEmployeeAssignments(): Promise<VideoCourse[]> {
        return this.get<VideoCourse[]>('/my-assignments');
    }

    async logProgress(payload: {
        videoId: number;
        lastPositionSecs: number;
        totalWatchSecs: number;
        completionPct: number;
    }): Promise<any> {
        return this.post<any, typeof payload>('/progress', payload);
    }

    async getReactions(videoId: number): Promise<Reactions> {
        return this.get<Reactions>(`/videos/${videoId}/reactions`);
    }

    async addReaction(videoId: number, reaction: string): Promise<any> {
        return this.post<any, { reaction: string }>(`/videos/${videoId}/reactions`, { reaction });
    }

    async removeReaction(videoId: number, reaction: string): Promise<any> {
        return this.delete<any>(`/videos/${videoId}/reactions`, { data: { reaction } });
    }

    async getComments(videoId: number): Promise<Comment[]> {
        return this.get<Comment[]>(`/videos/${videoId}/comments`);
    }

    async addComment(videoId: number, body: string, parentCommentId?: number): Promise<Comment> {
        return this.post<Comment, { body: string; parentCommentId?: number }>(`/videos/${videoId}/comments`, { body, parentCommentId });
    }
}

export const trainingApiService = new TrainingApiService();
export default trainingApiService;

