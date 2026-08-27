export type FollowupType = 'mail' | 'call' | 'visit' | 'letter' | 'whatsapp';
export type MailFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type FollowupSourceType = 'lead' | 'happy_calling' | 'enquiry';

export interface FollowupSource {
    sourceType: FollowupSourceType;
    sourceId: number;
}

export interface ContactPerson {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface BaseFollowup {
    id: number;
    leadId: number | null;
    happyCallingId: number | null;
    sourceType: FollowupSourceType;
    type: FollowupType;
    body: string | null;
    veResponsibility: string | null;
    attachments: string[];
    nextFollowupDate: string | null;
    frequency: MailFrequency | null;
    courierId: number | null;
    createdBy: number | null;
    createdByName: string | null;
    contacts: ContactPerson[];
    courier?: CourierFollowup | null;
    createdAt: string;
    updatedAt: string;
}

export interface CourierFollowup {
    id: number;
    userId: number;
    toOrg: string | null;
    toName: string | null;
    toAddr: string | null;
    toPin: string | null;
    toMobile: string | null;
    empFrom: number | null;
    delDate: string | null;
    urgency: number | null;
    courierProvider: string | null;
    docketNo: string | null;
    courierDocs: string[] | null;
    status: number | null;
    createdAt: string | null;
}

// ── Request Types ─────────────────────────────────────────────────────────────

export interface MailFollowupRequest {
    type: 'mail';
    body: string;
    frequency: MailFrequency;
    attachments: string[];
    nextFollowupDate?: string | null;
}

export interface CallFollowupRequest {
    type: 'call';
    body: string;
    veResponsibility?: string | null;
    contacts: ContactPerson[];
    nextFollowupDate?: string | null;
}

export interface VisitFollowupRequest {
    type: 'visit';
    body: string;
    veResponsibility?: string | null;
    contacts: ContactPerson[];
    nextFollowupDate?: string | null;
}

export interface LetterFollowupRequest {
    type: 'letter';
    toOrg: string;
    toName: string;
    toAddr: string;
    toPin: string;
    toMobile: string;
    empFrom: number;
    delDate: string;
    urgency: number;
    attachments: string[];
    nextFollowupDate?: string | null;
}

export interface WhatsappFollowupRequest {
    type: 'whatsapp';
    body: string;
    attachments: string[];
    nextFollowupDate?: string | null;
}

export type CreateFollowupRequest =
    | MailFollowupRequest
    | CallFollowupRequest
    | VisitFollowupRequest
    | LetterFollowupRequest
    | WhatsappFollowupRequest;