import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { projects } from "@/db/schemas/operations/projects.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { woBasicDetails, woDetails, woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses } from "@/db/schemas/operations/work-order.schema";
import { saleInvoices, saleInvoiceItems } from "@/db/schemas/operations/sale-invoices.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class SaleInvoiceService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getWoBillingData(projectId: number) {
        const [project] = await this.db
            .select({ tenderId: projects.tenderId })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const [basicDetail] = project.tenderId
            ? await this.db
                .select({ id: woBasicDetails.id })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, project.tenderId))
            : [];

        if (!basicDetail) {
            return { billingBoq: [], buybackBoq: [], billingAddresses: [], shippingAddresses: [] };
        }

        const [woDetail] = await this.db
            .select({ id: woDetails.id, buybackBoqApplicable: woDetails.buybackBoqApplicable })
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, basicDetail.id));

        if (!woDetail) {
            return { billingBoq: [], buybackBoq: [], billingAddresses: [], shippingAddresses: [] };
        }

        const [billingBoq, buybackBoq, billingAddresses, shippingAddresses] = await Promise.all([
            this.db.select().from(woBillingBoq).where(eq(woBillingBoq.woDetailId, woDetail.id)).orderBy(woBillingBoq.srNo),
            this.db.select().from(woBuybackBoq).where(eq(woBuybackBoq.woDetailId, woDetail.id)).orderBy(woBuybackBoq.srNo),
            this.db.select().from(woBillingAddresses).where(eq(woBillingAddresses.woDetailId, woDetail.id)),
            this.db.select().from(woShippingAddresses).where(eq(woShippingAddresses.woDetailId, woDetail.id)),
        ]);

        return {
            woDetailId: woDetail.id,
            buybackBoqApplicable: woDetail.buybackBoqApplicable,
            billingBoq,
            buybackBoq,
            billingAddresses,
            shippingAddresses,
        };
    }

    async generateInvoiceNumber(projectName?: string): Promise<string> {
        const sanitizedName = (projectName || "PROJ")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .toUpperCase();

        const now = new Date();
        const year = now.getFullYear();
        const fy = year % 100;
        const nextFy = (year + 1) % 100;
        const fyString = `${String(fy).padStart(2, "0")}${String(nextFy).padStart(2, "0")}`;

        const [last] = await this.db
            .select({ num: saleInvoices.invoiceNumber })
            .from(saleInvoices)
            .where(
                sql`${saleInvoices.invoiceNumber} LIKE ${`SI/${sanitizedName}/${fyString}/%`}`
            )
            .orderBy(desc(saleInvoices.id))
            .limit(1);

        let seq = 1;
        if (last?.num) {
            const parts = last.num.split("/");
            const lastSeq = Number.parseInt(parts.at(-1)?.replace("SI", "") || "0", 10);
            seq = lastSeq + 1;
        }

        return `SI/${sanitizedName}/${fyString}/SI${String(seq).padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const projectId = body.projectId;

        const [project] = await this.db
            .select({ projectName: projects.projectName, tenderId: projects.tenderId })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const tenderId = project.tenderId;
        let teamId: number | null = null;
        if (tenderId) {
            const [woBasic] = await this.db
                .select({ team: woBasicDetails.team })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, tenderId))
                .limit(1);
            teamId = woBasic?.team ?? null;
        }

        const invoiceNumber = await this.generateInvoiceNumber(project.projectName || undefined);

        let totalPreGst = 0;
        let totalGst = 0;
        let grandTotal = 0;

        const si = (
            await this.db
                .insert(saleInvoices)
                .values({
                    projectId,
                    tenderId: project.tenderId,
                    woDetailId: body.woDetailId,
                    invoiceNumber,
                    invoiceDate: body.invoiceDate,
                    billingCustomerName: body.billingCustomerName,
                    billingAddress: body.billingAddress,
                    billingGst: body.billingGst || null,
                    shippingCustomerName: body.shippingCustomerName,
                    shippingAddress: body.shippingAddress,
                    shippingGst: body.shippingGst || null,
                    status: "oe_request",
                    raisedBy: userId,
                    team: teamId,
                    remarks: body.remarks || null,
                })
                .returning()
        )[0];

        if (body.items && body.items.length > 0) {
            for (const item of body.items) {
                const qty = Number(item.qty);
                const rate = Number(item.rate);
                const gstRate = Number(item.gstRate);
                const amount = qty * rate;
                const gstAmount = (amount * gstRate) / 100;
                const totalAmount = amount + gstAmount;

                totalPreGst += amount;
                totalGst += gstAmount;
                grandTotal += totalAmount;

                await this.db.insert(saleInvoiceItems).values({
                    saleInvoiceId: si.id,
                    srNo: item.srNo || null,
                    itemDescription: item.itemDescription,
                    quantity: item.qty.toString(),
                    rate: item.rate.toString(),
                    amount: amount.toString(),
                    gstRate: item.gstRate.toString(),
                    gstAmount: gstAmount.toString(),
                    totalAmount: totalAmount.toString(),
                });
            }
        }

        await this.db
            .update(saleInvoices)
            .set({
                totalPreGst: totalPreGst.toString(),
                totalGst: totalGst.toString(),
                grandTotal: grandTotal.toString(),
            })
            .where(eq(saleInvoices.id, si.id));

        this.logger.info(`Sale Invoice created: ${invoiceNumber}`);

        return this.getById(si.id);
    }

    async getAll() {
        const rows = await this.db
            .select({
                id: saleInvoices.id,
                projectId: saleInvoices.projectId,
                invoiceNumber: saleInvoices.invoiceNumber,
                invoiceDate: saleInvoices.invoiceDate,
                billingCustomerName: saleInvoices.billingCustomerName,
                totalPreGst: saleInvoices.totalPreGst,
                totalGst: saleInvoices.totalGst,
                grandTotal: saleInvoices.grandTotal,
                status: saleInvoices.status,
                invoiceDocPaths: saleInvoices.invoiceDocPaths,
                projectName: projects.projectName,
                raisedByName: users.name,
                createdAt: saleInvoices.createdAt,
            })
            .from(saleInvoices)
            .leftJoin(projects, eq(saleInvoices.projectId, projects.id))
            .leftJoin(users, eq(saleInvoices.raisedBy, users.id))
            .orderBy(desc(saleInvoices.createdAt));
        return { saleInvoices: rows };
    }

    async updateStatus(id: number, body: { status: string; invoiceDocPaths?: string[] }) {
        const [existing] = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.id, id));
        if (!existing) throw new NotFoundException("Sale invoice not found");

        const validTransitions: Record<string, string[]> = {
            oe_request: ["invoiced"],
            invoiced: ["credit_note", "payment_received"],
            credit_note: ["payment_received"],
            payment_received: ["completed"],
        };

        const currentStatus = existing.status ?? "oe_request";
        if (body.status !== currentStatus) {
            if (!validTransitions[currentStatus]?.includes(body.status)) {
                throw new BadRequestException(
                    `Cannot transition from "${currentStatus}" to "${body.status}"`
                );
            }
        }

        const updateData: Record<string, any> = {
            status: body.status,
            updatedAt: new Date(),
        };

        if (body.invoiceDocPaths !== undefined) {
            updateData.invoiceDocPaths = body.invoiceDocPaths;
        }

        const [updated] = await this.db
            .update(saleInvoices)
            .set(updateData)
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} status updated to "${body.status}"`);
        return updated;
    }

    async getByProject(projectId: number) {
        const rows = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.projectId, projectId))
            .orderBy(desc(saleInvoices.createdAt));
        return { saleInvoices: rows };
    }

    async getById(id: number) {
        const [row] = await this.db
            .select({
                id: saleInvoices.id,
                projectId: saleInvoices.projectId,
                tenderId: saleInvoices.tenderId,
                woDetailId: saleInvoices.woDetailId,
                invoiceNumber: saleInvoices.invoiceNumber,
                invoiceDate: saleInvoices.invoiceDate,
                billingCustomerName: saleInvoices.billingCustomerName,
                billingAddress: saleInvoices.billingAddress,
                billingGst: saleInvoices.billingGst,
                shippingCustomerName: saleInvoices.shippingCustomerName,
                shippingAddress: saleInvoices.shippingAddress,
                shippingGst: saleInvoices.shippingGst,
                totalPreGst: saleInvoices.totalPreGst,
                totalGst: saleInvoices.totalGst,
                grandTotal: saleInvoices.grandTotal,
                invoiceTaxableAmount: saleInvoices.invoiceTaxableAmount,
                invoiceIgst: saleInvoices.invoiceIgst,
                invoiceCgst: saleInvoices.invoiceCgst,
                invoiceSgst: saleInvoices.invoiceSgst,
                invoiceTotal: saleInvoices.invoiceTotal,
                invoiceDocPaths: saleInvoices.invoiceDocPaths,
                cnTaxable: saleInvoices.cnTaxable,
                cnIgst: saleInvoices.cnIgst,
                cnCgst: saleInvoices.cnCgst,
                cnSgst: saleInvoices.cnSgst,
                cnTotal: saleInvoices.cnTotal,
                creditNoteDocPaths: saleInvoices.creditNoteDocPaths,
                paymentAdviceDocPaths: saleInvoices.paymentAdviceDocPaths,
                paymentAdviceRequestedAt: saleInvoices.paymentAdviceRequestedAt,
                paymentAdviceReceivedAt: saleInvoices.paymentAdviceReceivedAt,
                buybackInvoiceDocPaths: saleInvoices.buybackInvoiceDocPaths,
                gstTds: saleInvoices.gstTds,
                itTds: saleInvoices.itTds,
                ldDeduction: saleInvoices.ldDeduction,
                otherDeduction: saleInvoices.otherDeduction,
                netReceived: saleInvoices.netReceived,
                holdGstIgst: saleInvoices.holdGstIgst,
                holdGstCgst: saleInvoices.holdGstCgst,
                holdGstSgst: saleInvoices.holdGstSgst,
                holdItc: saleInvoices.holdItc,
                holdRetention: saleInvoices.holdRetention,
                holdBuyback: saleInvoices.holdBuyback,
                holdOther: saleInvoices.holdOther,
                totalHoldAmount: saleInvoices.totalHoldAmount,
                holdReleasedAmount: saleInvoices.holdReleasedAmount,
                holdReleasedAt: saleInvoices.holdReleasedAt,
                status: saleInvoices.status,
                raisedBy: saleInvoices.raisedBy,
                raisedByName: users.name,
                team: saleInvoices.team,
                remarks: saleInvoices.remarks,
                createdAt: saleInvoices.createdAt,
                updatedAt: saleInvoices.updatedAt,
            })
            .from(saleInvoices)
            .leftJoin(users, eq(saleInvoices.raisedBy, users.id))
            .where(eq(saleInvoices.id, id));
        if (!row) throw new NotFoundException("Sale invoice not found");

        const items = await this.db
            .select()
            .from(saleInvoiceItems)
            .where(eq(saleInvoiceItems.saleInvoiceId, id))
            .orderBy(saleInvoiceItems.srNo);

        return { ...row, items };
    }
}
