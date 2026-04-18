export interface ProjectDashboardResponse {
    project: ProjectDto;

    tender?: TenderDto;

    woBasicDetail?: WoBasicDetailDto;

    woDetail?: WoDetailDto;

    woAcceptanceYes?: WoAcceptanceYesDto;

    imprests: ImprestDto[];

    imprestSum: number;
}

export interface ProjectDto {
    id: number;
    teamName: string;
    organisationId: number | null;
    itemId: number;
    locationId: number | null;

    projectCode: string | null;
    projectName: string | null;

    poDate: string | null;

    tenderId: number | null;
}

export interface TenderDto {
    id: number;
    team: number;
    tenderNo: string;
    tenderName: string;

    organization: number | null;
    item: number;
    location: number | null;

    dueDate: string;
    status: number;
}

export interface WoBasicDetailDto {
    id: number;
    tenderNameId: number | null;

    number: string | null;
    date: string | null;

    parGst: string | null;
    parAmt: string | null;

    status: string;
}

export interface WoContactPerson {
    department: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
}

export interface WoDetailDto {
    id: number;
    basicDetailId: number | null;

    organization: string | null;

    // frontend should parse these
    departments: string | null;
    name: string | null;
    designation: string | null;
    phone: string | null;
    email: string | null;

    budget: string | null;

    meetingDateTime: string | null;
    googleMeetLink: string | null;
}

export interface WoAcceptanceYesDto {
    id: number;
    basicDetailId: number | null;

    woYes: string;

    pageNo: string | null;
    clauseNo: string | null;
    currentStatement: string | null;
    correctedStatement: string | null;
}

export interface ImprestDto {
    id: number;
    projectName: string | null;
    partyName: string | null;

    amount: number | null;
    remark: string | null;

    createdAt: string;
}
