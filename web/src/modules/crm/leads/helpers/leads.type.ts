export interface Lead {
    id: number;
    companyName: string | null;
    name: string | null;
    designation: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    country: string | null;
    state: string | null;
    type: string | null;
    industry: string | null;
    team: string | null;
    bdPerson: number | null;
    allocatedTe: number | null;
    allocationNotes: string | null;        // ← NEW
    pointsDiscussed: string | null;
    veResponsibility: string | null;
    mailFollowupCount: number | null;
    callFollowupCount: number | null;
    visitFollowupCount: number | null;
    letterSentCount: number | null;
    whatsappFollowupCount: number | null;
    enquiryReceivedAt: string | null;
    lastMailSentAt: string | null;
    lastCallAt: string | null;
    lastVisitAt: string | null;
    lastLetterSentAt: string | null;
    lastWhatsappSentAt: string | null;
    leadPriority: string | null;
    recentFollowUp: 'visit' | 'whatsapp' | 'letter' | 'mail' | 'call' | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadWithNames extends Lead {
    industryName?: string | null;
    typeName?: string | null;
    teamName?: string | null;
    bdPersonName?: string | null;
    allocatedTeName?: string | null;
}

export interface CreateLeadRequest {
    companyName: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
    address: string;
    country: string;
    state: string;
    type?: string | null;
    industry?: string | null;
    team?: string | null;
    bdPerson?: number | null;
    allocatedTe?: number | null;
    allocationNotes?: string | null;       // ← NEW
    pointsDiscussed?: string | null;
    veResponsibility?: string | null;
    leadPriority?: string | null;
    recentFollowUp?: 'visit' | 'whatsapp' | 'letter' | 'mail' | 'call' | null;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

// ← NEW: dedicated allocation request type
export interface AllocateLeadRequest {
    allocatedTe: number;
    allocationNotes?: string | null;
}

export interface LeadListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}