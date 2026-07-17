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
    allocatedBy: number | null;         
    allocationNotes: string | null;
    allocatedAt: string | null;       
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
    allocatedByName?: string | null;    // ← NEW
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
    allocationNotes?: string | null;
    pointsDiscussed?: string | null;
    veResponsibility?: string | null;
    leadPriority?: string | null;
    recentFollowUp?: 'visit' | 'whatsapp' | 'letter' | 'mail' | 'call' | null;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

export interface AllocateLeadRequest {
    allocatedTe: number;
    allocationNotes?: string | null;
    // allocatedBy is NOT here — backend gets it from JWT
}

export interface LeadListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}