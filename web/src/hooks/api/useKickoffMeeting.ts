import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kickOffMeetingApi } from '@/services/api/kick-off-meeting.api';
import type { SaveKickoffMeetingDto, UpdateKickoffMeetingMomDto } from '@/modules/operations/types/wo.types';

export const KICKOFF_MEETING_KEYS = {
    all: ['kickOffMeetings'] as const,
    byWoDetailId: (id: number) => [...KICKOFF_MEETING_KEYS.all, 'woDetailId', id] as const,
};

export const useKickoffMeetingByWoId = (woDetailId?: number) => {
    return useQuery({
        queryKey: KICKOFF_MEETING_KEYS.byWoDetailId(woDetailId!),
        queryFn: () => kickOffMeetingApi.getByWoDetailId(woDetailId!),
        enabled: !!woDetailId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useSaveKickoffMeeting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SaveKickoffMeetingDto) => kickOffMeetingApi.saveMeeting(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: KICKOFF_MEETING_KEYS.byWoDetailId(data.woDetailId),
            });
        },
    });
};

export const useUpdateKickoffMom = (woDetailId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateKickoffMeetingMomDto }) => 
            kickOffMeetingApi.updateMom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: KICKOFF_MEETING_KEYS.byWoDetailId(woDetailId),
            });
        },
    });
};
