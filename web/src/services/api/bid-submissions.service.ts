import axiosInstance from '@/lib/axios';
import type { BidSubmission } from '@/types/api.types';

export type BidSubmissionDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    finalCosting: string | null;
    bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
    bidSubmissionId: number | null;
    costingSheetId: number | null;
};

export type SubmitBidDto = {
    tenderId: number;
    submissionDatetime: string;
    submittedDocs: string[];
    proofOfSubmission: string;
    finalPriceSs: string;
    finalBiddingPrice: string | null;
};

export type MarkAsMissedDto = {
    tenderId: number;
    reasonForMissing: string;
    preventionMeasures: string;
    tmsImprovements: string;
};

export type UpdateBidSubmissionDto = {
    submissionDatetime?: string;
    submittedDocs?: string[];
    proofOfSubmission?: string;
    finalPriceSs?: string;
    finalBiddingPrice?: string | null;
    reasonForMissing?: string;
    preventionMeasures?: string;
    tmsImprovements?: string;
};

export const bidSubmissionsService = {
    getAll: async (): Promise<BidSubmissionDashboardRow[]> => {
        const response = await axiosInstance.get<BidSubmissionDashboardRow[]>('/bid-submissions');
        return response.data;
    },

    getById: async (id: number): Promise<BidSubmission> => {
        const response = await axiosInstance.get<BidSubmission>(`/bid-submissions/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<BidSubmission | null> => {
        const response = await axiosInstance.get<BidSubmission>(`/bid-submissions/tender/${tenderId}`);
        return response.data;
    },

    submitBid: async (data: SubmitBidDto): Promise<BidSubmission> => {
        const response = await axiosInstance.post<BidSubmission>('/bid-submissions/submit', data);
        return response.data;
    },

    markAsMissed: async (data: MarkAsMissedDto): Promise<BidSubmission> => {
        const response = await axiosInstance.post<BidSubmission>('/bid-submissions/missed', data);
        return response.data;
    },

    update: async (id: number, data: UpdateBidSubmissionDto): Promise<BidSubmission> => {
        const response = await axiosInstance.patch<BidSubmission>(`/bid-submissions/${id}`, data);
        return response.data;
    },
};
