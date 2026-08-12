import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { serviceCustomerFeedback, customerComplaints, serviceEngineers } from "@/db/schemas";
import type { CreateServiceFeedbackDto, UpdateServiceFeedbackDto } from "./dto/service-feedback.dto";

@Injectable()
export class ServiceFeedbackService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(complaintId?: number) {
        const where = complaintId ? eq(serviceCustomerFeedback.complaintId, complaintId) : undefined;
        return this.db
            .select()
            .from(serviceCustomerFeedback)
            .where(where)
            .orderBy(desc(serviceCustomerFeedback.createdAt));
    }

    async getById(id: number) {
        const [feedback] = await this.db
            .select()
            .from(serviceCustomerFeedback)
            .where(eq(serviceCustomerFeedback.id, id))
            .limit(1);
        if (!feedback) {
            throw new NotFoundException("Service customer feedback not found");
        }
        return feedback;
    }

    async getByComplaintId(complaintId: number) {
        const [feedback] = await this.db
            .select()
            .from(serviceCustomerFeedback)
            .where(eq(serviceCustomerFeedback.complaintId, complaintId))
            .limit(1);
        return feedback;
    }

    async getJoinedList() {
        return this.db
            .select({
                feedbackId: serviceCustomerFeedback.id,
                complaintId: customerComplaints.id,
                problemResolved: serviceCustomerFeedback.problemResolved,
                satisfaction: serviceCustomerFeedback.satisfaction,
                suggestions: serviceCustomerFeedback.suggestions,
                feedbackCreatedAt: serviceCustomerFeedback.createdAt,
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
            .leftJoin(serviceCustomerFeedback, eq(serviceCustomerFeedback.complaintId, customerComplaints.id))
            .orderBy(desc(serviceEngineers.createdAt));
    }

    async create(body: CreateServiceFeedbackDto, userId?: number) {
        return this.db.transaction(async tx => {
            const existing = await tx
                .select({ id: serviceCustomerFeedback.id })
                .from(serviceCustomerFeedback)
                .where(eq(serviceCustomerFeedback.complaintId, body.complaintId))
                .limit(1);

            if (existing.length > 0) {
                throw new Error("Service customer feedback already exists for this complaint");
            }

            const [feedback] = await tx
                .insert(serviceCustomerFeedback)
                .values({
                    complaintId: body.complaintId,
                    problemResolved: body.problemResolved,
                    satisfaction: body.satisfaction ?? null,
                    suggestions: body.suggestions ?? null,
                })
                .returning();
            return feedback;
        });
    }

    async update(id: number, body: UpdateServiceFeedbackDto) {
        const [existing] = await this.db
            .select({ id: serviceCustomerFeedback.id })
            .from(serviceCustomerFeedback)
            .where(eq(serviceCustomerFeedback.id, id))
            .limit(1);
        if (!existing) {
            throw new NotFoundException("Service customer feedback not found");
        }

        const updateData: Record<string, unknown> = {};
        if (body.problemResolved !== undefined) updateData.problemResolved = body.problemResolved;
        if (body.satisfaction !== undefined) updateData.satisfaction = body.satisfaction ?? null;
        if (body.suggestions !== undefined) updateData.suggestions = body.suggestions ?? null;

        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await this.db.update(serviceCustomerFeedback).set(updateData).where(eq(serviceCustomerFeedback.id, id));
        }
        return this.getById(id);
    }

    async remove(id: number) {
        await this.db.delete(serviceCustomerFeedback).where(eq(serviceCustomerFeedback.id, id));
        return { success: true };
    }
}
