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
        return error.response?.data?.message || error.message
    }
    if (error instanceof Error) {
        return error.message
    }
    return 'An unexpected error occurred'
}
