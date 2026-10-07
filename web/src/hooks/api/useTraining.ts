import {
    trainingApiService,
    type Comment,
    type Employee,
    type LearnerProgress,
    type Reactions,
    type VideoCourse
} from "@/services/api/training.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const trainingKey = {
    all: ["training"] as const,
    lists: () => [...trainingKey.all, "list"] as const,
    employees: () => [...trainingKey.all, "employees"] as const,
    progress: () => [...trainingKey.all, "progress"] as const,
    employeeAssignments: () => [...trainingKey.all, "employeeAssignments"] as const,
    reactions: (videoId: number) => [...trainingKey.all, "reactions", videoId] as const,
    comments: (videoId: number) => [...trainingKey.all, "comments", videoId] as const,
};

export const useTrainingVideos = () => {
    return useQuery<VideoCourse[]>({
        queryKey: trainingKey.lists(),
        queryFn: () => trainingApiService.getAll(),
    });
};

export const useUploadTrainingVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (execute: () => Promise<VideoCourse>) => execute(),
        onSuccess: (newVideo) => {
            queryClient.invalidateQueries({ queryKey: trainingKey.lists() });
            toast.success(`Video "${newVideo.title}" uploaded and queued for processing.`);
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to upload video";
            toast.error(message);
        },
    });
};

export const useDeleteTrainingVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => trainingApiService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainingKey.lists() });
            queryClient.invalidateQueries({ queryKey: trainingKey.progress() });
            toast.success("Video deleted successfully.");
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to delete video";
            toast.error(message);
        },
    });
};

export const useTogglePublishTrainingVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => trainingApiService.togglePublish(id),
        onSuccess: (video) => {
            queryClient.invalidateQueries({ queryKey: trainingKey.lists() });
            toast.success(`"${video.title}" has been ${video.isPublished ? "published" : "hidden"}.`);
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to update video publication status";
            toast.error(message);
        },
    });
};


export const useTrainingEmployees = () => {
    return useQuery<Employee[]>({
        queryKey: trainingKey.employees(),
        queryFn: () => trainingApiService.getEmployees(),
    });
};

interface AssignTrainingPayload {
    videoId?: number;
    videoIds?: number[];
    userIds: number[];
}

interface AssignTrainingResult {
    succeeded: number;
    failed: number;
    total: number;
}

export const useAssignTrainingVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignTrainingPayload): Promise<AssignTrainingResult> => {
            const ids = data.videoIds ?? (data.videoId != null ? [data.videoId] : []);

            if (ids.length === 0) return { succeeded: 0, failed: 0, total: 0 };

            // Single course — identical to the previous behaviour: one request, and a
            // rejected promise still propagates so UploadVideo's catch block fires.
            if (ids.length === 1) {
                await trainingApiService.assignVideo(ids[0], data.userIds);
                return { succeeded: 1, failed: 0, total: 1 };
            }

            // Each call targets a distinct videoId, so concurrent inserts cannot
            // collide on the (videoId, userId) pair.
            const results = await Promise.allSettled(
                ids.map(id => trainingApiService.assignVideo(id, data.userIds)),
            );
            const succeeded = results.filter(r => r.status === "fulfilled").length;
            const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;

            if (rejected && succeeded === 0) throw rejected.reason;

            return { succeeded, failed: ids.length - succeeded, total: ids.length };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: trainingKey.progress() });

            if (result.total === 0) return;
            if (result.total === 1) {
                toast.success("Video assigned successfully.");
                return;
            }

            if (result.failed > 0) {
                toast.warning(`Assigned ${result.succeeded} of ${result.total} courses.`);
            } else {
                toast.success(`Assigned ${result.succeeded} courses.`);
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to assign video";
            toast.error(message);
        },
    });
};

export const useLearnersProgress = () => {
    return useQuery<LearnerProgress[]>({
        queryKey: trainingKey.progress(),
        queryFn: () => trainingApiService.getLearnersProgress(),
    });
};

export const useEmployeeAssignments = () => {
    return useQuery<VideoCourse[]>({
        queryKey: trainingKey.employeeAssignments(),
        queryFn: () => trainingApiService.getEmployeeAssignments(),
    });
};

export const useLogProgress = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { videoId: number; lastPositionSecs: number; totalWatchSecs: number; completionPct: number }) => 
            trainingApiService.logProgress(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: trainingKey.employeeAssignments() });
            queryClient.invalidateQueries({ queryKey: trainingKey.progress() });
        },
        onError: (err) => {
            console.error("Failed to log watch progress:", err);
        }
    });
};

export const useVideoReactions = (videoId: number, enabled = true) => {
    return useQuery<Reactions>({
        queryKey: trainingKey.reactions(videoId),
        queryFn: () => trainingApiService.getReactions(videoId),
        enabled: !!videoId && enabled,
    });
};

export const useAddReaction = (videoId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reaction: string) => trainingApiService.addReaction(videoId, reaction),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainingKey.reactions(videoId) });
        },
        onError: (err) => {
            console.error("Failed to add reaction:", err);
        }
    });
};

export const useRemoveReaction = (videoId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reaction: string) => trainingApiService.removeReaction(videoId, reaction),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainingKey.reactions(videoId) });
        },
        onError: (err) => {
            console.error("Failed to remove reaction:", err);
        }
    });
};

export const useVideoComments = (videoId: number, enabled = true) => {
    return useQuery<Comment[]>({
        queryKey: trainingKey.comments(videoId),
        queryFn: () => trainingApiService.getComments(videoId),
        enabled: !!videoId && enabled,
    });
};

export const useAddComment = (videoId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { body: string; parentCommentId?: number }) => 
            trainingApiService.addComment(videoId, payload.body, payload.parentCommentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainingKey.comments(videoId) });
            toast.success("Comment posted!");
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to post comment";
            toast.error(message);
        },
    });
};

