import type { ScheduleRaFormValues, UploadRaResultFormValues } from './reverseAuction.schema';

/**
 * Props for RAResultForm component
 */
export interface RAResultFormProps {
    open: boolean;
    onClose: () => void;
    raId: number;
    raData?: RaDashboardRow;
}

export type UploadResultDto = {
    technicallyQualified: 'Yes' | 'No';
    disqualificationReason?: string;
    qualifiedPartiesCount?: string;
    qualifiedPartiesNames?: string[];
    result?: 'Won' | 'Lost';
    l1Price?: string;
    l2Price?: string;
    ourPrice?: string;
    qualifiedPartiesScreenshot?: string;
    finalResultScreenshot?: string;
};

export type ReverseAuction = {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    tenderValue: string | null;
    itemName: string | null;
    bidSubmissionDate: Date | null;
    status: string;
    technicallyQualified: string | null;
    disqualificationReason: string | null;
    qualifiedPartiesCount: string | null;
    qualifiedPartiesNames: string[] | null;
    raStartTime: Date | null;
    raEndTime: Date | null;
    scheduledAt: Date | null;
    raResult: string | null;
    veL1AtStart: string | null;
    raStartPrice: string | null;
    raClosePrice: string | null;
    raCloseTime: Date | null;
    screenshotQualifiedParties: string | null;
    screenshotDecrements: string | null;
    finalResultScreenshot: string | null;
    resultUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ScheduleRaDto = {
    technicallyQualified: 'Yes' | 'No';
    disqualificationReason?: string;
    qualifiedPartiesCount?: string;
    qualifiedPartiesNames?: string[];
    raStartTime?: string;
    raEndTime?: string;
};

export type UploadRaResultDto = {
    raResult: 'Won' | 'Lost' | 'H1 Elimination';
    veL1AtStart: 'Yes' | 'No';
    raStartPrice?: string;
    raClosePrice?: string;
    raCloseTime?: string;
    screenshotQualifiedParties?: string;
    screenshotDecrements?: string;
    finalResultScreenshot?: string;
};

export type RaDashboardTab = 'under-evaluation' | 'scheduled' | 'completed';

export interface RaDashboardRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    raStatus: string;
    raStartTime: Date | null;
    raEndTime: Date | null;
    technicallyQualified: string | null;
    result: string | null;
}

export interface RaDashboardCounts {
    underEvaluation: number;
    scheduled: number;
    completed: number;
    total: number;
}

export interface RaDashboardResponse {
    data: RaDashboardRow[];
    counts?: RaDashboardCounts; // Optional - counts are fetched separately via getDashboardCounts
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}


export type { ScheduleRaFormValues, UploadRaResultFormValues };

export type RaDashboardListParams = {
    tabKey?: RaDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};
