export type RecipientSource =
    | { type: 'user'; userId: number }
    | { type: 'role'; role: string; teamId: number }
    | { type: 'emails'; emails: string[] };

export interface SendEmailOptions {
    // Reference (for threading & labeling)
    referenceType: string;
    referenceId: number;
    eventType: string;

    // Sender
    fromUserId: number;

    // Recipients
    to: RecipientSource[];
    cc?: RecipientSource[];

    // Content
    subject: string;
    template: string;
    data: Record<string, any>;

    // Optional
    labelPath?: string;
    attachments?: {
        files: string[];
        baseDir?: string;
    };
}

export interface SendTenderEmailOptions {
    tenderId: number;
    eventType: string;
    fromUserId: number;
    to: RecipientSource[];
    cc?: RecipientSource[];
    subject: string;
    template: string;
    data: Record<string, any>;
    attachments?: {
        files: string[];
        baseDir?: string;
    };
}

export interface ResolvedEmail {
    fromEmail: string;
    fromUserId: number;
    toEmails: string[];
    ccEmails: string[];
    subject: string;
    htmlBody: string;
    labelPath: string;
    threadId?: string;
    inReplyTo?: string;
    messageId: string;
    attachments?: Array<{ filename: string; path: string }>;
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    threadId?: string;
    error?: string;
}

export type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed';
