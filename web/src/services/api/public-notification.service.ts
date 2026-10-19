import { BaseApiService } from "./base.service";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface PublicPaymentRequestEntity {
    id: number;
    referenceNo: string | null;
    amount: string | null;
    partyName: string | null;
    category: string | null;
    status: string;
    utrNumber: string | null;
    rejectionReason: string | null;
    remark: string | null;
    requestedByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PublicOrderEntity {
    id: number;
    referenceNo: string | null;
    sellerName: string | null;
    projectName: string | null;
    category: string | null;
    grandTotal: string | null;
    tdsPercentage: string | null;
    tdsAmount: string | null;
    amountAfterTds: string | null;
    approvalStatus: ApprovalStatus;
    approvalRemark: string | null;
    raisedByName: string | null;
    orderDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PublicVendorWorkOrderEntity extends PublicOrderEntity {
    scopeOfWork: string | null;
}

export interface PublicTenderEntity {
    id: number;
    referenceNo: string | null;
    tenderName: string | null;
    dueDate: string | null;
    grandTotal: string | null;
    allocatedToName: string | null;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface PublicWoBasicDetailEntity {
    id: number;
    referenceNo: string | null;
    projectName: string | null;
    projectCode: string | null;
    value: string | null;
    organizationName: string | null;
    woDate: string | null;
    currentStage: string | null;
    raisedByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export type PublicNotificationEntity =
    | PublicPaymentRequestEntity
    | PublicOrderEntity
    | PublicVendorWorkOrderEntity
    | PublicTenderEntity
    | PublicWoBasicDetailEntity;

export interface PublicNotificationResponse {
    type: "pr" | "po" | "tender" | "vwo" | "wobd";
    event: string | null;
    entity: PublicNotificationEntity;
}

class PublicNotificationService extends BaseApiService {
    constructor() {
        super("/public-notifications");
    }

    getByToken(token: string): Promise<PublicNotificationResponse> {
        return this.get<PublicNotificationResponse>(`/${token}`, { skipAuthRedirect: true });
    }
}

export const publicNotificationService = new PublicNotificationService();
