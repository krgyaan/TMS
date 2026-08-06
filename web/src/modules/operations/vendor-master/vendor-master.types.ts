export interface NewPartyForm {
    name: string;
    alias: string;
    email: string;
    address: string;
    gstNo: string;
    pan: string;
    msme: string;
    contact_person: string;
    mobile_number: string;
}

export interface CreatePartyDTO {
    name: string;
    alias?: string;
    email?: string;
    address?: string;
    gstNo?: string;
    pan?: string;
    msme?: string;
    type?: string;
    contact_person?: string;
    mobile_number?: string;
}

export interface Beneficiary {
    id: number;
    name: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    bankName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BeneficiaryFormValues {
    name: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
}
