import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

export const showErrorToast = (error: unknown): void => {
    const errorMessage = handleQueryError(error);

    // Check if it's a multi-line validation error
    const isValidationError = errorMessage.includes('Please fix the following');

    toast.error(errorMessage, {
        duration: isValidationError ? 8000 : 5000,
        style: {
            whiteSpace: 'pre-line',
        },
    });
};
