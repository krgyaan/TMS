import { eq, sql } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { users, tenderInfos, organizations } from "@/db/schemas/";
import { paymentRequests, vendorWorkOrders, vendorWorkOrderItems, woBasicDetails } from "@/db/schemas/operations";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface PublicPaymentRequestDto {
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
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicOrderDto {
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
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicVendorWorkOrderDto extends PublicOrderDto {
    scopeOfWork: string | null;
}

export interface PublicTenderDto {
    id: number;
    referenceNo: string | null;
    tenderName: string | null;
    dueDate: Date | null;
    grandTotal: string | null;
    allocatedToName: string | null;
    status: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicWoBasicDetailDto {
    id: number;
    referenceNo: string | null;
    projectName: string | null;
    projectCode: string | null;
    value: string | null;
    organizationName: string | null;
    woDate: string | null;
    currentStage: string | null;
    raisedByName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type PublicEntityDto =
    | PublicPaymentRequestDto
    | PublicOrderDto
    | PublicVendorWorkOrderDto
    | PublicTenderDto
    | PublicWoBasicDetailDto;

export type EntityResolver = (db: DbInstance, id: number) => Promise<PublicEntityDto | null>;

export const ENTITY_RESOLVERS = "PUBLIC_NOTIFICATION_ENTITY_RESOLVERS";

const toApprovalStatus = (value: boolean | null | undefined): ApprovalStatus => (value === null || value === undefined ? "pending" : value ? "approved" : "rejected");

const resolvePaymentRequest: EntityResolver = async (db, id) => {
    const [row] = await db
        .select({
            id: paymentRequests.id,
            referenceNo: paymentRequests.requestNo,
            amount: paymentRequests.amount,
            partyName: paymentRequests.partyName,
            category: paymentRequests.paymentAgainst,
            status: paymentRequests.status,
            utrNumber: paymentRequests.utrNumber,
            rejectionReason: paymentRequests.rejectionReason,
            remark: paymentRequests.remark,
            requestedByName: users.name,
            createdAt: paymentRequests.createdAt,
            updatedAt: paymentRequests.updatedAt,
        })
        .from(paymentRequests)
        .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
        .where(eq(paymentRequests.id, id))
        .limit(1);

    return row ?? null;
};

const resolvePurchaseOrder: EntityResolver = async (db, id) => {
    const [row] = await db
        .select({
            id: purchaseOrders.id,
            referenceNo: purchaseOrders.poNumber,
            sellerName: purchaseOrders.sellerName,
            projectName: purchaseOrders.projectName,
            category: purchaseOrders.category,
            tdsPercentage: purchaseOrders.tdsPercentage,
            tdsAmount: purchaseOrders.tdsAmount,
            amountAfterTds: purchaseOrders.amountAfterTds,
            approvalFlag: purchaseOrders.poApproved,
            approvalRemark: purchaseOrders.poApprovalRemark,
            raisedByName: users.name,
            orderDate: purchaseOrders.poDate,
            createdAt: purchaseOrders.createdAt,
            updatedAt: purchaseOrders.updatedAt,
        })
        .from(purchaseOrders)
        .leftJoin(users, eq(users.id, purchaseOrders.poRaisedBy))
        .where(eq(purchaseOrders.id, id))
        .limit(1);

    if (!row) return null;

    const [{ total } = { total: null }] = await db
        .select({ total: sql<string | null>`coalesce(sum(${purchaseOrderProducts.totalAmount}), '0')` })
        .from(purchaseOrderProducts)
        .where(eq(purchaseOrderProducts.purchaseOrderId, id));

    const { approvalFlag, ...rest } = row;
    return {
        ...rest,
        grandTotal: total ?? null,
        approvalStatus: toApprovalStatus(approvalFlag),
    };
};

const resolveVendorWorkOrder: EntityResolver = async (db, id) => {
    const [row] = await db
        .select({
            id: vendorWorkOrders.id,
            referenceNo: vendorWorkOrders.woNumber,
            sellerName: vendorWorkOrders.sellerName,
            projectName: vendorWorkOrders.projectName,
            category: vendorWorkOrders.category,
            tdsPercentage: vendorWorkOrders.tdsPercentage,
            tdsAmount: vendorWorkOrders.tdsAmount,
            amountAfterTds: vendorWorkOrders.amountAfterTds,
            approvalFlag: vendorWorkOrders.woApproved,
            approvalRemark: vendorWorkOrders.woApprovalRemark,
            raisedByName: users.name,
            orderDate: vendorWorkOrders.woDate,
            scopeOfWork: vendorWorkOrders.scopeOfWork,
            createdAt: vendorWorkOrders.createdAt,
            updatedAt: vendorWorkOrders.updatedAt,
        })
        .from(vendorWorkOrders)
        .leftJoin(users, eq(users.id, vendorWorkOrders.woRaisedBy))
        .where(eq(vendorWorkOrders.id, id))
        .limit(1);

    if (!row) return null;

    const [{ total } = { total: null }] = await db
        .select({ total: sql<string | null>`coalesce(sum(${vendorWorkOrderItems.totalAmount}), '0')` })
        .from(vendorWorkOrderItems)
        .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));

    const { approvalFlag, ...rest } = row;
    return {
        ...rest,
        grandTotal: total ?? null,
        approvalStatus: toApprovalStatus(approvalFlag),
    };
};

const resolveTender: EntityResolver = async (db, id) => {
    const [row] = await db
        .select({
            id: tenderInfos.id,
            referenceNo: tenderInfos.tenderNo,
            tenderName: tenderInfos.tenderName,
            dueDate: tenderInfos.dueDate,
            grandTotal: tenderInfos.gstValues,
            allocatedToName: users.name,
            status: sql<string | null>`coalesce(${tenderInfos.tlStatus}::text, null)`,
            createdAt: tenderInfos.createdAt,
            updatedAt: tenderInfos.updatedAt,
        })
        .from(tenderInfos)
        .leftJoin(users, eq(users.id, tenderInfos.teamMember))
        .where(eq(tenderInfos.id, id))
        .limit(1);

    return row ?? null;
};

const resolveWoBasicDetails: EntityResolver = async (db, id) => {
    const [row] = await db
        .select({
            id: woBasicDetails.id,
            referenceNo: woBasicDetails.woNumber,
            projectName: woBasicDetails.projectName,
            projectCode: woBasicDetails.projectCode,
            value: woBasicDetails.woValuePreGst,
            organizationName: organizations.name,
            woDate: woBasicDetails.woDate,
            currentStage: woBasicDetails.currentStage,
            raisedByName: users.name,
            createdAt: woBasicDetails.createdAt,
            updatedAt: woBasicDetails.updatedAt,
        })
        .from(woBasicDetails)
        .leftJoin(tenderInfos, eq(tenderInfos.id, woBasicDetails.tenderId))
        .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
        .leftJoin(users, eq(users.id, woBasicDetails.createdBy))
        .where(eq(woBasicDetails.id, id))
        .limit(1);

    return row ?? null;
};

/**
 * Registry of entity types a public notification link can point at.
 * To support a new notification type, add its entity type to
 * `PublicNotifyEntityType` and register a resolver here.
 */
export const ENTITY_RESOLVER_MAP: Record<string, EntityResolver> = {
    pr: resolvePaymentRequest,
    po: resolvePurchaseOrder,
    vwo: resolveVendorWorkOrder,
    tender: resolveTender,
    wobd: resolveWoBasicDetails,
};
