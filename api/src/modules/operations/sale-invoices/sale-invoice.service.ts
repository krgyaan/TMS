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

    async update(id: number, body: Record<string, any>, userId: number) {
        const [existing] = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.id, id));
        if (!existing) throw new NotFoundException("Sale invoice not found");

        const currentStatus = existing.status ?? "oe_request";
        let newStatus = currentStatus;

        if (body.status && body.status !== currentStatus) {
            const validTransitions: Record<string, string[]> = {
                oe_request: ["invoiced"],
                invoiced: ["credit_note", "payment_received"],
                credit_note: ["payment_received"],
                payment_received: ["completed"],
            };
            if (!validTransitions[currentStatus]?.includes(body.status)) {
                throw new BadRequestException(
                    `Cannot transition from "${currentStatus}" to "${body.status}"`
                );
            }
            newStatus = body.status;
        }

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (body.status) updateData.status = body.status;

        if (body.invoiceTaxableAmount !== undefined) updateData.invoiceTaxableAmount = body.invoiceTaxableAmount.toString();
        if (body.invoiceIgst !== undefined) updateData.invoiceIgst = body.invoiceIgst.toString();
        if (body.invoiceCgst !== undefined) updateData.invoiceCgst = body.invoiceCgst.toString();
        if (body.invoiceSgst !== undefined) updateData.invoiceSgst = body.invoiceSgst.toString();
        if (body.invoiceDocPaths !== undefined) updateData.invoiceDocPaths = body.invoiceDocPaths;

        if (body.invoiceTaxableAmount !== undefined || body.invoiceIgst !== undefined || body.invoiceCgst !== undefined || body.invoiceSgst !== undefined) {
            updateData.invoiceTotal = (
                Number(body.invoiceTaxableAmount ?? existing.invoiceTaxableAmount ?? 0) +
                Number(body.invoiceIgst ?? existing.invoiceIgst ?? 0) +
                Number(body.invoiceCgst ?? existing.invoiceCgst ?? 0) +
                Number(body.invoiceSgst ?? existing.invoiceSgst ?? 0)
            ).toFixed(2);
        }

        if (body.cnTaxable !== undefined) updateData.cnTaxable = body.cnTaxable.toString();
        if (body.cnIgst !== undefined) updateData.cnIgst = body.cnIgst.toString();
        if (body.cnCgst !== undefined) updateData.cnCgst = body.cnCgst.toString();
        if (body.cnSgst !== undefined) updateData.cnSgst = body.cnSgst.toString();
        if (body.creditNoteDocPaths !== undefined) updateData.creditNoteDocPaths = body.creditNoteDocPaths;

        if (body.cnTaxable !== undefined || body.cnIgst !== undefined || body.cnCgst !== undefined || body.cnSgst !== undefined) {
            updateData.cnTotal = (
                Number(body.cnTaxable ?? existing.cnTaxable ?? 0) +
                Number(body.cnIgst ?? existing.cnIgst ?? 0) +
                Number(body.cnCgst ?? existing.cnCgst ?? 0) +
                Number(body.cnSgst ?? existing.cnSgst ?? 0)
            ).toFixed(2);
        }

        if (body.paymentAdviceDocPaths !== undefined) updateData.paymentAdviceDocPaths = body.paymentAdviceDocPaths;
        if (body.buybackInvoiceDocPaths !== undefined) updateData.buybackInvoiceDocPaths = body.buybackInvoiceDocPaths;
        if (body.gstTds !== undefined) updateData.gstTds = body.gstTds.toString();
        if (body.itTds !== undefined) updateData.itTds = body.itTds.toString();
        if (body.ldDeduction !== undefined) updateData.ldDeduction = body.ldDeduction.toString();
        if (body.otherDeduction !== undefined) updateData.otherDeduction = body.otherDeduction.toString();

        if (body.holdGstIgst !== undefined) updateData.holdGstIgst = body.holdGstIgst.toString();
        if (body.holdGstCgst !== undefined) updateData.holdGstCgst = body.holdGstCgst.toString();
        if (body.holdGstSgst !== undefined) updateData.holdGstSgst = body.holdGstSgst.toString();
        if (body.holdItc !== undefined) updateData.holdItc = body.holdItc.toString();
        if (body.holdRetention !== undefined) updateData.holdRetention = body.holdRetention.toString();
        if (body.holdBuyback !== undefined) updateData.holdBuyback = body.holdBuyback.toString();
        if (body.holdOther !== undefined) updateData.holdOther = body.holdOther.toString();

        if (body.holdGstIgst !== undefined || body.holdGstCgst !== undefined || body.holdGstSgst !== undefined ||
            body.holdItc !== undefined || body.holdRetention !== undefined || body.holdBuyback !== undefined || body.holdOther !== undefined) {
            updateData.totalHoldAmount = (
                Number(body.holdGstIgst ?? existing.holdGstIgst ?? 0) +
                Number(body.holdGstCgst ?? existing.holdGstCgst ?? 0) +
                Number(body.holdGstSgst ?? existing.holdGstSgst ?? 0) +
                Number(body.holdItc ?? existing.holdItc ?? 0) +
                Number(body.holdRetention ?? existing.holdRetention ?? 0) +
                Number(body.holdBuyback ?? existing.holdBuyback ?? 0) +
                Number(body.holdOther ?? existing.holdOther ?? 0)
            ).toFixed(2);
        }

        if (body.holdReleasedAmount !== undefined) {
            const existingReleased = Number(existing.holdReleasedAmount ?? 0);
            updateData.holdReleasedAmount = (existingReleased + Number(body.holdReleasedAmount)).toFixed(2);
        }
        if (body.holdReleasedAt !== undefined) {
            updateData.holdReleasedAt = body.holdReleasedAt;
        }

        const actionLog = existing.actionLogs ?? [];
        const actionEntry = {
            action: newStatus !== currentStatus ? `status_changed_to_${newStatus}` : `${Object.keys(body).filter(k => k !== 'status').join('_')}_updated`,
            data: body,
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };
        updateData.actionLogs = [...actionLog, actionEntry];

        const [updated] = await this.db
            .update(saleInvoices)
            .set(updateData)
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} updated`);
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
                actionLogs: saleInvoices.actionLogs,
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
