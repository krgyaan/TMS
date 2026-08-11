import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { serviceReports, customerComplaints, serviceEngineers } from "@/db/schemas";
import type { CreateServiceReportDto, UpdateServiceReportDto } from "./dto/service-visit.dto";

@Injectable()
export class ServiceVisitService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(complaintId?: number) {
        const where = complaintId ? eq(serviceReports.complaintId, complaintId) : undefined;
        return this.db.select().from(serviceReports).where(where).orderBy(desc(serviceReports.createdAt));
    }

    async getById(id: number) {
        const [report] = await this.db.select().from(serviceReports).where(eq(serviceReports.id, id)).limit(1);
        if (!report) {
            throw new NotFoundException("Service visit report not found");
        }
        return report;
    }

    async getByComplaintId(complaintId: number) {
        const [report] = await this.db.select().from(serviceReports).where(eq(serviceReports.complaintId, complaintId)).limit(1);
        return report;
    }

    async getJoinedList() {
        return this.db
            .select({
                reportId: serviceReports.id,
                complaintId: customerComplaints.id,
                remarks: serviceReports.remarks,
                resolutionDone: serviceReports.resolutionDone,
                unsignedPhoto: serviceReports.unsignedPhoto,
                signedPhoto: serviceReports.signedPhoto,
                resolvedPhoto: serviceReports.resolvedPhoto,
                visitDate: serviceReports.visitDate,
                uploadedBy: serviceReports.uploadedBy,
                reportCreatedAt: serviceReports.createdAt,
                reportUpdatedAt: serviceReports.updatedAt,
                ticketNo: customerComplaints.ticketNo,
                siteProjectName: customerComplaints.siteProjectName,
                customerName: customerComplaints.name,
                organization: customerComplaints.organization,
                siteLocation: customerComplaints.siteLocation,
                complaintStatus: customerComplaints.status,
                serviceEngineerName: serviceEngineers.name,
                engineerAllottedAt: serviceEngineers.createdAt,
            })
            .from(serviceEngineers)
            .innerJoin(customerComplaints, eq(serviceEngineers.complaintId, customerComplaints.id))
            .leftJoin(serviceReports, eq(serviceReports.complaintId, customerComplaints.id))
            .orderBy(desc(serviceEngineers.createdAt));
    }

    async create(body: CreateServiceReportDto, userId?: number) {
        return this.db.transaction(async tx => {
            const existing = await tx.select({ id: serviceReports.id }).from(serviceReports).where(eq(serviceReports.complaintId, body.complaintId)).limit(1);

            if (existing.length > 0) {
                throw new Error("Service visit report already exists for this complaint");
            }

            const [report] = await tx
                .insert(serviceReports)
                .values({
                    complaintId: body.complaintId,
                    serviceEngineerId: body.serviceEngineerId ?? null,
                    remarks: body.remarks,
                    resolutionDone: body.resolutionDone ?? null,
                    unsignedPhoto: body.unsignedPhoto.length > 0 ? body.unsignedPhoto : null,
                    signedPhoto: body.signedPhoto.length > 0 ? body.signedPhoto : null,
                    resolvedPhoto: body.resolvedPhoto.length > 0 ? body.resolvedPhoto : null,
                    visitDate: body.visitDate ? new Date(body.visitDate) : null,
                    uploadedBy: userId,
                })
                .returning();
            return report;
        });
    }

    async update(id: number, body: UpdateServiceReportDto) {
        const [existing] = await this.db.select({ id: serviceReports.id }).from(serviceReports).where(eq(serviceReports.id, id)).limit(1);
        if (!existing) {
            throw new NotFoundException("Service visit report not found");
        }

        const updateData: Record<string, unknown> = {};
        if (body.complaintId !== undefined) updateData.complaintId = body.complaintId;
        if (body.serviceEngineerId !== undefined) updateData.serviceEngineerId = body.serviceEngineerId ?? null;
        if (body.remarks !== undefined) updateData.remarks = body.remarks;
        if (body.resolutionDone !== undefined) updateData.resolutionDone = body.resolutionDone ?? null;
        if (body.unsignedPhoto !== undefined) updateData.unsignedPhoto = body.unsignedPhoto.length > 0 ? body.unsignedPhoto : null;
        if (body.signedPhoto !== undefined) updateData.signedPhoto = body.signedPhoto.length > 0 ? body.signedPhoto : null;
        if (body.resolvedPhoto !== undefined) updateData.resolvedPhoto = body.resolvedPhoto.length > 0 ? body.resolvedPhoto : null;
        if (body.visitDate !== undefined) updateData.visitDate = body.visitDate ? new Date(body.visitDate) : null;

        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await this.db.update(serviceReports).set(updateData).where(eq(serviceReports.id, id));
        }
        return this.getById(id);
    }

    async remove(id: number) {
        await this.db.delete(serviceReports).where(eq(serviceReports.id, id));
        return { success: true };
    }
}
