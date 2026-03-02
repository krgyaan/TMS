import type { RequestExtensionFormValues } from './requestExtension.schema';
import type { CreateRequestExtensionDto, RequestExtensionListRow, RequestExtensionResponse, UpdateRequestExtensionDto } from './requestExtension.types';
// Build default values (for create mode)
export const buildDefaultValues = (): RequestExtensionFormValues => {
    return {
        tenderId: 0,
        days: 0,
        reason: '',
        clients: [],
    };
};

export const mapResponseToForm = (
    existingData: RequestExtensionResponse | RequestExtensionListRow | null
): RequestExtensionFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }
    return {
        tenderId: existingData.tenderId,
        days: existingData.days,
        reason: existingData.reason,
        clients: existingData.clients ?? [],
    };
};


// Map form values to Create DTO
export const mapFormToCreatePayload = (values: RequestExtensionFormValues): CreateRequestExtensionDto => {
    return {
        tenderId: values.tenderId,
        days: values.days,
        reason: values.reason,
        clients: values.clients,
    };
};

// Map form values to Update DTO
export const mapFormToUpdatePayload = (
    id: number,
    values: RequestExtensionFormValues
): UpdateRequestExtensionDto => {
    return {
        id,
        tenderId: values.tenderId,
        days: values.days,
        reason: values.reason,
        clients: values.clients,
    };
};
