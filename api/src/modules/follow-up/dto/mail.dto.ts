export interface FollowupMailBase {
    id: number;
    partyName: string;
    followupFor: string | null;
    details: string;
    reminderCount: number;
    area: string;
    assignedToId: number | null;
    attachments: string[];
    emdId: number | null;
    startFrom: string;
}

export interface FollowupMailPayload {
    template: {
        name: string;
        basePath: string;
    };
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

export interface FollowupMailData {
    base: FollowupMailBase;
    payload: FollowupMailPayload;
}
