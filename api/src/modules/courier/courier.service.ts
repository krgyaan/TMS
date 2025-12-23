// src/modules/courier/courier.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { couriers } from "@/db/schemas/shared/couriers.schema";
import { users } from "@/db//schemas/auth/users.schema";

import type { CreateCourierDto } from "@/modules/courier/zod/create-courier.schema";
import type { UpdateCourierDto } from "@/modules/courier/zod/update-courier.schema";
import type { DispatchCourierDto } from "@/modules/courier/zod/dispatch-courier.schema";

import { MailerService } from "@/mailer/mailer.service";

// Status constants
export const COURIER_STATUS = {
    PENDING: 0,
    IN_TRANSIT: 1,
    DISPATCHED: 2,
    NOT_DELIVERED: 3,
    DELIVERED: 4,
    REJECTED: 5,
} as const;

interface CourierDoc {
    url: string;
    name: string;
    type: "image" | "file";
}

@Injectable()
export class CourierService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,
        private readonly mailer: MailerService
    ) { }

    private validateDispatchData(dispatchData: DispatchCourierDto): void {
        if (!dispatchData.courierProvider?.trim()) {
            throw new BadRequestException("Courier provider is required");
        }
        if (!dispatchData.docketNo?.trim()) {
            throw new BadRequestException("Docket number is required");
        }
        if (!dispatchData.pickupDate) {
            throw new BadRequestException("Pickup date is required");
        }

        const pickupDate = new Date(dispatchData.pickupDate);
        if (isNaN(pickupDate.getTime())) {
            throw new BadRequestException("Invalid pickup date format");
        }
    }

    async create(data: CreateCourierDto, userId: number) {
        const values = {
            toOrg: data.toOrg,
            toName: data.toName,
            toAddr: data.toAddr,
            toPin: data.toPin,
            toMobile: data.toMobile,
            empFrom: data.empFrom,
            urgency: data.urgency,
            userId,
            delDate: new Date(data.delDate),
            courierDocs: [],
            status: COURIER_STATUS.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.db.insert(couriers).values(values).returning();

        // optional welcome/notification mail (kept from original)
        try {
            const mail = await this.mailer.sendMail({
                to: "abhijeetgaur.dev@gmail.com",
                subject: "New courier created",
                html: `<h1>Courier Created</h1><p>Courier ID: ${result[0].id}</p>`,
            });
            console.log("Notification mail sent:", mail);
        } catch (e) {
            console.warn("Failed to send mail:", e);
        }

        return result[0];
    }

    // Get all couriers (dashboard)
    async findAll() {
        return this.db.query.couriers.findMany({
            orderBy: (courier, { desc }) => desc(courier.createdAt),
            with: {
                empFromUser: true,
            },
        });
    }
    // Get couriers by status
    async findByStatus(status: number) {
        return this.db.select().from(couriers).where(eq(couriers.status, status)).orderBy(desc(couriers.createdAt));
    }

    // Grouped by status
    async findAllGroupedByStatus() {
        const allCouriers = await this.findAll();

        const byStatus = {
            pending: allCouriers.filter(c => c.status === COURIER_STATUS.PENDING),
            dispatched: allCouriers.filter(c => c.status === COURIER_STATUS.DISPATCHED),
            not_delivered: allCouriers.filter(c => c.status === COURIER_STATUS.NOT_DELIVERED),
            delivered: allCouriers.filter(c => c.status === COURIER_STATUS.DELIVERED),
            rejected: allCouriers.filter(c => c.status === COURIER_STATUS.REJECTED),
        };

        return {
            ...byStatus,
            counts: {
                pending: byStatus.pending.length,
                dispatched: byStatus.dispatched.length,
                not_delivered: byStatus.not_delivered.length,
                delivered: byStatus.delivered.length,
                rejected: byStatus.rejected.length,
            },
        };
    }

    async findAllByUser(userId: number) {
        return this.db.select().from(couriers).where(eq(couriers.userId, userId)).orderBy(desc(couriers.createdAt));
    }

    async findOne(id: number) {
        const result = await this.db.select().from(couriers).where(eq(couriers.id, id)).limit(1);
        return result[0] ?? null;
    }

    async findOneWithDetails(id: number) {
        const result = await this.db
            .select({
                id: couriers.id,
                userId: couriers.userId,
                toOrg: couriers.toOrg,
                toName: couriers.toName,
                toAddr: couriers.toAddr,
                toPin: couriers.toPin,
                toMobile: couriers.toMobile,
                empFrom: couriers.empFrom,
                delDate: couriers.delDate,
                urgency: couriers.urgency,
                courierProvider: couriers.courierProvider,
                pickupDate: couriers.pickupDate,
                docketNo: couriers.docketNo,
                docketSlip: couriers.docketSlip,
                deliveryDate: couriers.deliveryDate,
                deliveryPod: couriers.deliveryPod,
                withinTime: couriers.withinTime,
                courierDocs: couriers.courierDocs,
                status: couriers.status,
                trackingNumber: couriers.trackingNumber,
                createdAt: couriers.createdAt,
                updatedAt: couriers.updatedAt,
                createdByName: users.name,
                createdByEmail: users.email,
            })
            .from(couriers)
            .leftJoin(users, eq(couriers.userId, users.id))
            .where(eq(couriers.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException("Courier not found");
        }

        // sender info (empFrom)
        const sender = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
            })
            .from(users)
            .where(eq(users.id, result[0].empFrom))
            .limit(1);

        return {
            ...result[0],
            sender: sender[0] ?? null,
        };
    }

    async update(id: number, data: UpdateCourierDto, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException("Not authorized to update this courier");
        }

        const updateData: Record<string, any> = { updatedAt: new Date() };

        if (data.toOrg !== undefined) updateData.toOrg = data.toOrg;
        if (data.toName !== undefined) updateData.toName = data.toName;
        if (data.toAddr !== undefined) updateData.toAddr = data.toAddr;
        if (data.toPin !== undefined) updateData.toPin = data.toPin;
        if (data.toMobile !== undefined) updateData.toMobile = data.toMobile;
        if (data.empFrom !== undefined) updateData.empFrom = data.empFrom;
        if (data.urgency !== undefined) updateData.urgency = data.urgency;
        if (data.delDate !== undefined) updateData.delDate = new Date(data.delDate);

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

        return result[0];
    }

    // Update status (delivery info)
    async updateStatus(
        id: number,
        statusData: {
            status: number;
            deliveryDate?: string;
            withinTime?: boolean;
        },
        userId: number
    ) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");

        const updateData: Record<string, any> = {
            status: statusData.status,
            updatedAt: new Date(),
        };

        if (statusData.status === COURIER_STATUS.DELIVERED) {
            if (statusData.deliveryDate) updateData.deliveryDate = new Date(statusData.deliveryDate);
            if (statusData.withinTime !== undefined) updateData.withinTime = statusData.withinTime;
        }

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();
        return result[0];
    }

    /**
     * Dispatch with optional docket slip file (POST endpoint)
     */
    async createDispatch(id: number, dispatchData: DispatchCourierDto, file: Express.Multer.File | undefined, userId: number) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");

        // Validate dispatch data
        this.validateDispatchData(dispatchData);

        const updateData: Record<string, any> = {
            courierProvider: dispatchData.courierProvider.trim(),
            docketNo: dispatchData.docketNo.trim(),
            pickupDate: new Date(dispatchData.pickupDate),
            status: COURIER_STATUS.DISPATCHED,
            updatedAt: new Date(),
        };

        // If file present, add doc to courierDocs
        if (file) {
            // existing.courierDocs may be JSONB array or null
            const existingDocs: string[] = Array.isArray(existing.courierDocs) ? existing.courierDocs : [];
            updateData.courierDocs = [...existingDocs, file?.filename];
        }

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();
        return result[0];
    }

    // Update dispatch info without file
    async updateDispatch(
        id: number,
        dispatchData: {
            courierProvider: string;
            docketNo: string;
            pickupDate: string;
        },
        userId: number
    ) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");
        const updateData = {
            courierProvider: dispatchData.courierProvider,
            docketNo: dispatchData.docketNo,
            pickupDate: new Date(dispatchData.pickupDate),
            status: COURIER_STATUS.DISPATCHED,
            updatedAt: new Date(),
        };

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();
        return result[0];
    }

    async delete(id: number, userId: number) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");

        if (existing.userId !== userId) {
            throw new ForbiddenException("Not authorized to delete this courier");
        }

        await this.db.delete(couriers).where(eq(couriers.id, id));
        return { success: true };
    }

    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");

        // if (existing.userId !== userId) {
        //     throw new ForbiddenException("Not authorized");
        // }

        const existingDocs = Array.isArray(existing.courierDocs) ? existing.courierDocs : [];
        const updatedDocs = [...existingDocs, ...files.map(file => file.filename)];

        const result = await this.db
            .update(couriers)
            .set({
                courierDocs: updatedDocs,
                updatedAt: new Date(),
            })
            .where(eq(couriers.id, id))
            .returning();

        return result[0];
    }

    // Upload delivery POD
    async uploadDeliveryPod(id: number, file: Express.Multer.File, userId: number) {
        const existing = await this.findOne(id);
        if (!existing) throw new NotFoundException("Courier not found");

        // Optionally you might want to check permissions
        const result = await this.db
            .update(couriers)
            .set({
                deliveryPod: `pod/${file.filename}`,
                updatedAt: new Date(),
            })
            .where(eq(couriers.id, id))
            .returning();

        return result[0];
    }
}
