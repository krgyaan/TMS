import type { UploadResultFormValues } from './tenderResult.schema';

export type ResultDashboardFilters = {
    tab?: ResultDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    teamId?: number;
};

export interface UploadResultFormPageProps {
    id: number;
    data: {
        qualifiedPartiesCount: string | null;
        qualifiedPartiesNames: string[] | null;
        result: string | null;
        l1Price: string | null;
        l2Price: string | null;
        ourPrice: string | null;
        qualifiedPartiesScreenshot: string | null;
        finalResultScreenshot: string | null;
        resultUploadedAt: Date | null;
    }
}
export interface EmdDetails {
    amount: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayText: string;
}

export type TenderResult = {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamExecutiveName: string | null;
    tenderValue: string | null;
    itemName: string | null;
    status: string;
    reverseAuctionId: number | null;
    raApplicable: boolean;
    technicallyQualified: string | null;
    disqualificationReason: string | null;
    qualifiedPartiesCount: string | null;
    qualifiedPartiesNames: string[] | null;
    result: string | null;
    l1Price: string | null;
    l2Price: string | null;
    ourPrice: string | null;
    qualifiedPartiesScreenshot: string | null;
    finalResultScreenshot: string | null;
    resultUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ResultDashboardType = 'result-awaited' | 'won' | 'lost' | 'disqualified';

export interface ResultDashboardRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamExecutiveName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    finalPrice: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    resultStatus: string;
    raApplicable: boolean;
    reverseAuctionId: number | null;
    emdDetails: EmdDetails | null;
    technicallyQualified: string | null;
}

export interface ResultDashboardCounts {
    pending: number;
    won: number;
    lost: number;
    disqualified: number;
    total: number;
    totalAmounts: {
        pending: number;
        won: number;
        lost: number;
        disqualified: number;
    };
}

export interface ResultDashboardResponse {
    data: ResultDashboardRow[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    counts: ResultDashboardCounts;
}
export type { UploadResultFormValues };
