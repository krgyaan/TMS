export interface FollowupMailBase {
    id: number;
    partyName: string;
    followupFor: string | null;
    details: string | null;
    reminderCount: number;
    area: string;
    assignedToId: number | null;
    attachments: string[] | null;
    emdId: number | null;
    startFrom: string;
}

export interface FollowupMailData {
    fu: FollowupMailBase;
    to: string[];
    cc: string[];
    instrumentData: Record<string, any>;
}

export interface FollowupMailPayload {
    template: any;
    context: Record<string, any>;
    to: string[];
    cc: string[];
    subject: string;
    attachments?: {
        files: string[];
        baseDir: string;
    };
    assignedToUserId: number;
}
