import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { conferenceCallReports, customerComplaints, serviceEngineers } from "@/db/schemas";
import type { CreateConferenceCallReportDto, UpdateConferenceCallReportDto } from "./dto/conference.dto";

@Injectable()
export class ConferenceService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(complaintId?: number) {
        const where = complaintId ? eq(conferenceCallReports.complaintId, complaintId) : undefined;
        return this.db.select().from(conferenceCallReports).where(where).orderBy(desc(conferenceCallReports.createdAt));
    }

    async getById(id: number) {
        const [report] = await this.db.select().from(conferenceCallReports).where(eq(conferenceCallReports.id, id)).limit(1);
        if (!report) {
            throw new NotFoundException("Conference call report not found");
        }
        return report;
    }

    async getByComplaintId(complaintId: number) {
        const [report] = await this.db.select().from(conferenceCallReports).where(eq(conferenceCallReports.complaintId, complaintId)).limit(1);
        return report;
    }

    async getJoinedList() {
        return this.db
            .select({
                conferenceId: conferenceCallReports.id,
                complaintId: customerComplaints.id,
                issueDescription: conferenceCallReports.issueDescription,
                materialsRequired: conferenceCallReports.materialsRequired,
                actionsPlanned: conferenceCallReports.actionsPlanned,
                voiceRecordingPath: conferenceCallReports.voiceRecordingPath,
                attachments: conferenceCallReports.attachments,
                conferenceCreatedAt: conferenceCallReports.createdAt,
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
            .leftJoin(conferenceCallReports, eq(conferenceCallReports.complaintId, customerComplaints.id))
            .orderBy(desc(serviceEngineers.createdAt));
    }

    async create(body: CreateConferenceCallReportDto, userId?: number) {
        return this.db.transaction(async tx => {
            const existing = await tx.select({ id: conferenceCallReports.id }).from(conferenceCallReports).where(eq(conferenceCallReports.complaintId, body.complaintId)).limit(1);

            if (existing.length > 0) {
                throw new Error("Conference call report already exists for this complaint");
            }

            const [report] = await tx
                .insert(conferenceCallReports)
                .values({
                    complaintId: body.complaintId,
                    issueDescription: body.issueDescription,
                    materialsRequired: body.materialsRequired ?? null,
                    actionsPlanned: body.actionsPlanned ?? null,
                    voiceRecordingPath: body.voiceRecordingPath ?? null,
                    attachments: body.attachments.length > 0 ? body.attachments : null,
                    createdBy: userId,
                })
                .returning();
            return report;
        });
    }

    async update(id: number, body: UpdateConferenceCallReportDto) {
        const [existing] = await this.db.select({ id: conferenceCallReports.id }).from(conferenceCallReports).where(eq(conferenceCallReports.id, id)).limit(1);
        if (!existing) {
            throw new NotFoundException("Conference call report not found");
        }

        const updateData: Record<string, unknown> = {};
        if (body.issueDescription !== undefined) updateData.issueDescription = body.issueDescription;
        if (body.materialsRequired !== undefined) updateData.materialsRequired = body.materialsRequired ?? null;
        if (body.actionsPlanned !== undefined) updateData.actionsPlanned = body.actionsPlanned ?? null;
        if (body.voiceRecordingPath !== undefined) updateData.voiceRecordingPath = body.voiceRecordingPath ?? null;
        if (body.attachments !== undefined) updateData.attachments = body.attachments.length > 0 ? body.attachments : null;

        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await this.db.update(conferenceCallReports).set(updateData).where(eq(conferenceCallReports.id, id));
        }
        return this.getById(id);
    }

    async remove(id: number) {
        await this.db.delete(conferenceCallReports).where(eq(conferenceCallReports.id, id));
        return { success: true };
    }
}
