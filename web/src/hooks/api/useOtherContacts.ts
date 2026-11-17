import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { otherContactsService, type CreateOtherContactPayload } from '@/services/api/other-contacts.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const otherContactsKey = {
    all: ['other-contacts'] as const,
    list: (purpose?: string) => [...otherContactsKey.all, purpose ?? 'all'] as const,
};

/**
 * Contacts stored in `other_contacts` (not tied to a tender/project).
 * `purpose` tags the feature, e.g. 'BG'.
 */
export const useOtherContacts = (purpose?: string) => {
    return useQuery({
        queryKey: otherContactsKey.list(purpose),
        queryFn: () => otherContactsService.list(purpose),
    });
};

export const useAddOtherContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOtherContactPayload) => otherContactsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: otherContactsKey.all });
            toast.success('Contact person added successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
