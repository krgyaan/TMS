import type { FollowUpTab } from "./followUp.constants";

export interface UserMini {
    id: number;
    name: string;
    email?: string | null;
}

export interface ContactPerson {
    id?: number;
    name?: string | null;
    designation?: string | null;
    email?: string | null;
    phone?: string | null;
    org?: string | null;
}

export interface FollowUpListRow {
    id: number;
    area: string;
    partyName: string;
    amount: number;
    frequency: number | null;
    frequencyLabel?: string | number;
    status: string;
    latestComment?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    startFrom?: string | null;
    nextFollowUpDate?: string | null;
    assignedToId?: number | null;
    createdById?: number | null;
    assignee?: UserMini | null;
    creator?: UserMini | null;
    contacts?: ContactPerson[];
    stopReason?: number | null;
    stopReasonLabel?: string | null;
}

export interface FollowUpDetails {
    id: number;
    area: string;
    partyName: string;
    amount?: number | null;
    followupFor?: string | null;
    assignedToId?: number | null;
    createdById?: number | null;
    details?: string | null;
    status: string;
    frequency?: number | null;
    startFrom?: string | null;
    nextFollowUpDate?: string | null;
    stopReason?: number | null;
    proofText?: string | null;
    proofImagePath?: string | null;
    stopRemarks?: string | null;
    followUpHistory?: unknown[];
    reminderCount?: number;
    emdId?: number | null;
    contacts: ContactPerson[];
    attachments?: string[];
    assignee?: UserMini | null;
    creator?: UserMini | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface FollowUpQueryParams {
    tab?: FollowUpTab | "all";
    assignedToId?: number;
    createdById?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface FollowUpCounts {
    ongoing: number;
    achieved: number;
    angry: number;
    future: number;
}

export interface CreateFollowUpDto {
    area: string;
    partyName: string;
    amount?: number;
    followupFor: string;
    assignedToId?: number | null;
    comment?: string | null;
    contacts: ContactPerson[];
    details?: string | null;
    frequency?: number | null;
    startFrom?: string;
    createdById?: number | null;
    emdId?: number | null;
}

export interface UpdateFollowUpPayload {
    area?: string;
    partyName?: string;
    amount?: number;
    followupFor?: string | null;
    assignedToId?: number | null;
    details?: string | null;
    contacts?: ContactPerson[];
    frequency?: number | null;
    startFrom?: string | null;
    stopReason?: number | null;
    proofText?: string | null;
    stopRemarks?: string | null;
    proofImage?: string | null;
    attachments?: string[];
    removedAttachments?: string[];
}

export interface UpdateFollowUpStatusPayload {
    latestComment?: string;
    nextFollowUpDate?: string | null;
    frequency?: number;
    stopReason?: number | null;
    proofText?: string | null;
    stopRemarks?: string | null;
    proofImage?: string | null;
}

export interface FollowUpListResponse {
    data: FollowUpListRow[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
