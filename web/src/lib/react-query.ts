import { QueryClient, type DefaultOptions } from '@tanstack/react-query'
import { AxiosError } from 'axios'

const queryConfig: DefaultOptions = {
    queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false, // Add this to prevent refetch when network reconnects
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    },
    mutations: {
        retry: 0,
    },
}

export const queryClient = new QueryClient({
    defaultOptions: queryConfig,
})

// Error handler
export const handleQueryError = (error: unknown): string => {
    if (error instanceof AxiosError) {
        const responseData = error.response?.data;

        // Handle Zod validation errors (NestJS returns them in a specific format)
        if (responseData?.issues && Array.isArray(responseData.issues)) {
            const issues = responseData.issues as Array<{ path: (string | number)[]; message: string }>;
            const errorMessages = issues.map(issue => {
                const fieldPath = issue.path.join('.');
                return `${fieldPath}: ${issue.message}`;
            });
            return errorMessages.join('; ') || responseData.message || error.message;
        }

        // Handle standard error messages
        if (responseData?.message) {
            // If message is an array, join it
            if (Array.isArray(responseData.message)) {
                return responseData.message.join('; ');
            }
            return responseData.message;
        }

        return error.message || 'An unexpected error occurred';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}
