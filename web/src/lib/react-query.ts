import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const queryConfig: DefaultOptions = {
    queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    },
    mutations: {
        retry: 0,
    },
};

export const queryClient = new QueryClient({
    defaultOptions: queryConfig,
});

/**
 * Converts camelCase/snake_case to Title Case
 */
const formatFieldName = (field: string): string => {
    // Handle nested fields like clients.0.clientName
    if (field.includes('.')) {
        const parts = field.split('.');

        // Handle array indices (e.g., clients.0.clientName -> Clients #1 - Client Name)
        if (parts.length >= 3 && !isNaN(Number(parts[1]))) {
            const arrayName = formatFieldName(parts[0]);
            const index = parseInt(parts[1]) + 1;
            const fieldName = formatFieldName(parts[2]);
            return `${arrayName} #${index} - ${fieldName}`;
        }

        return parts.map(formatFieldName).join(' → ');
    }

    return field
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim();
};

interface ValidationError {
    field: string;
    message: string;
    code?: string;
    expected?: string;
    received?: string;
}

interface ZodIssue {
    path: (string | number)[];
    message: string;
    code?: string;
    expected?: string;
    received?: string;
}

interface ApiErrorResponse {
    message?: string | string[];
    errors?: ValidationError[];
    issues?: ZodIssue[];
    statusCode?: number;
}

/**
 * Extract and format error messages from API response
 */
export const handleQueryError = (error: unknown): string => {
    if (error instanceof AxiosError) {
        const responseData = error.response?.data as ApiErrorResponse | undefined;

        if (!responseData) {
            return error.message || 'An unexpected error occurred';
        }

        // Handle formatted validation errors (from your ValidatedBody decorator)
        if (responseData.errors && Array.isArray(responseData.errors)) {
            const errorMessages = responseData.errors.map((err) => {
                const label = formatFieldName(err.field);

                // Create detailed message for type errors
                if (err.code === 'invalid_type' && err.expected && err.received) {
                    return `${label}: Expected ${err.expected}, got ${err.received}`;
                }

                return `${label}: ${err.message}`;
            });

            if (errorMessages.length > 0) {
                // Return first 5 errors
                const displayErrors = errorMessages.slice(0, 5);
                let result = displayErrors.join('\n• ');

                if (errorMessages.length > 5) {
                    result += `\n\n...and ${errorMessages.length - 5} more error(s)`;
                }

                return `Please fix the following:\n\n• ${result}`;
            }
        }

        // Handle raw Zod validation errors (if backend sends raw format)
        if (responseData.issues && Array.isArray(responseData.issues)) {
            const errorMessages = responseData.issues.map((issue) => {
                const fieldPath = issue.path.join('.');
                const label = formatFieldName(fieldPath);
                return `${label}: ${issue.message}`;
            });

            if (errorMessages.length > 0) {
                const displayErrors = errorMessages.slice(0, 5);
                let result = displayErrors.join('\n• ');

                if (errorMessages.length > 5) {
                    result += `\n\n...and ${errorMessages.length - 5} more error(s)`;
                }

                return `Please fix the following:\n\n• ${result}`;
            }
        }

        // Handle simple message
        if (responseData.message) {
            if (Array.isArray(responseData.message)) {
                return responseData.message.join('; ');
            }

            // If message is just "Validation failed" but no errors array, show generic message
            if (responseData.message === 'Validation failed') {
                return 'Validation failed. Please check your input and try again.';
            }

            return responseData.message;
        }

        return error.message || 'An unexpected error occurred';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred';
};
