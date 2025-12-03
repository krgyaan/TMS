// src/modules/courier/courier.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";

import { DRIZZLE } from "../../db/database.module";
import type { DbInstance } from "../../db";
import { couriers } from "../../db/couriers.schema";
import { users } from "../../db/users.schema";

import type { CreateCourierDto } from "./zod/create-courier.schema";
import type { UpdateCourierDto } from "./zod/update-courier.schema";
import type { DispatchCourierDto } from "./zod/dispatch-courier.schema";

import { MailerService } from "src/mailer/mailer.service";

// Status constants
export const COURIER_STATUS = {
    PENDING: 0,
    DISPATCHED: 1,
    NOT_DELIVERED: 2,
    DELIVERED: 3,
    REJECTED: 4,
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
    ) {}

    private validateDispatchData(dispatchData: DispatchCourierDto): void {
        if (!dispatchData.courier_provider?.trim()) {
            throw new BadRequestException("Courier provider is required");
        }
        if (!dispatchData.docket_no?.trim()) {
            throw new BadRequestException("Docket number is required");
        }
        if (!dispatchData.pickup_date) {
            throw new BadRequestException("Pickup date is required");
        }

        // Validate pickup_date is a valid date
        const pickupDate = new Date(dispatchData.pickup_date);
        if (isNaN(pickupDate.getTime())) {
            throw new BadRequestException("Invalid pickup date format");
        }
    }

    async create(data: CreateCourierDto, userId: number) {
        const result = await this.db
            .insert(couriers)
            .values({
                to_org: data.to_org,
                to_name: data.to_name,
                to_addr: data.to_addr,
                to_pin: data.to_pin,
                to_mobile: data.to_mobile,
                emp_from: data.emp_from,
                urgency: data.urgency,
                user_id: userId,
                del_date: new Date(data.del_date),
                courier_docs: [],
                status: COURIER_STATUS.PENDING,
            })
            .returning();

        const mail = await this.mailer.sendMail({
            to: "abhijeetgaur.dev@gmail.com",
            subject: "Welcome!",
            html: "<h1>Hello!</h1><p>You are registered.</p>",
        });

        console.log(mail);

        return result[0];
    }

    // Get all couriers with user info (for dashboard)
    async findAll() {
        return this.db
            .select({
                id: couriers.id,
                user_id: couriers.user_id,
                to_org: couriers.to_org,
                to_name: couriers.to_name,
                to_addr: couriers.to_addr,
                to_pin: couriers.to_pin,
                to_mobile: couriers.to_mobile,
                emp_from: couriers.emp_from,
                del_date: couriers.del_date,
                urgency: couriers.urgency,
                courier_docs: couriers.courier_docs,
                status: couriers.status,
                tracking_number: couriers.tracking_number,
                courier_provider: couriers.courier_provider,
                pickup_date: couriers.pickup_date,
                docket_no: couriers.docket_no,
                delivery_date: couriers.delivery_date,
                delivery_pod: couriers.delivery_pod,
                within_time: couriers.within_time,
                created_at: couriers.created_at,
                updated_at: couriers.updated_at,
            })
            .from(couriers)
            .orderBy(desc(couriers.created_at));
    }

    // Get couriers by status
    async findByStatus(status: number) {
        return this.db.select().from(couriers).where(eq(couriers.status, status)).orderBy(desc(couriers.created_at));
    }

    // Get couriers grouped by status (for dashboard tabs)
    async findAllGroupedByStatus() {
        const allCouriers = await this.findAll();

        return {
            pending: allCouriers.filter(c => c.status === COURIER_STATUS.PENDING),
            dispatched: allCouriers.filter(c => c.status === COURIER_STATUS.DISPATCHED),
            not_delivered: allCouriers.filter(c => c.status === COURIER_STATUS.NOT_DELIVERED),
            delivered: allCouriers.filter(c => c.status === COURIER_STATUS.DELIVERED),
            rejected: allCouriers.filter(c => c.status === COURIER_STATUS.REJECTED),
            counts: {
                pending: allCouriers.filter(c => c.status === COURIER_STATUS.PENDING).length,
                dispatched: allCouriers.filter(c => c.status === COURIER_STATUS.DISPATCHED).length,
                not_delivered: allCouriers.filter(c => c.status === COURIER_STATUS.NOT_DELIVERED).length,
                delivered: allCouriers.filter(c => c.status === COURIER_STATUS.DELIVERED).length,
                rejected: allCouriers.filter(c => c.status === COURIER_STATUS.REJECTED).length,
            },
        };
    }

    async findAllByUser(userId: number) {
        return this.db.select().from(couriers).where(eq(couriers.user_id, userId)).orderBy(desc(couriers.created_at));
    }

    async findOne(id: number) {
        const result = await this.db.select().from(couriers).where(eq(couriers.id, id)).limit(1);

        return result[0] ?? null;
    }

    async findOneWithDetails(id: number) {
        const result = await this.db
            .select({
                id: couriers.id,
                user_id: couriers.user_id,
                to_org: couriers.to_org,
                to_name: couriers.to_name,
                to_addr: couriers.to_addr,
                to_pin: couriers.to_pin,
                to_mobile: couriers.to_mobile,
                emp_from: couriers.emp_from,
                del_date: couriers.del_date,
                urgency: couriers.urgency,
                courier_provider: couriers.courier_provider,
                pickup_date: couriers.pickup_date,
                docket_no: couriers.docket_no,
                delivery_date: couriers.delivery_date,
                delivery_pod: couriers.delivery_pod,
                within_time: couriers.within_time,
                courier_docs: couriers.courier_docs,
                status: couriers.status,
                tracking_number: couriers.tracking_number,
                created_at: couriers.created_at,
                updated_at: couriers.updated_at,
                created_by_name: users.name,
                created_by_email: users.email,
            })
            .from(couriers)
            .leftJoin(users, eq(couriers.user_id, users.id))
            .where(eq(couriers.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException("Courier not found");
        }

        // Get sender (emp_from) details
        const sender = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
            })
            .from(users)
            .where(eq(users.id, result[0].emp_from))
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

        if (existing.user_id !== userId) {
            throw new ForbiddenException("Not authorized to update this courier");
        }

        const updateData: Record<string, any> = {
            updated_at: new Date(),
        };

        if (data.to_org !== undefined) updateData.to_org = data.to_org;
        if (data.to_name !== undefined) updateData.to_name = data.to_name;
        if (data.to_addr !== undefined) updateData.to_addr = data.to_addr;
        if (data.to_pin !== undefined) updateData.to_pin = data.to_pin;
        if (data.to_mobile !== undefined) updateData.to_mobile = data.to_mobile;
        if (data.emp_from !== undefined) updateData.emp_from = data.emp_from;
        if (data.urgency !== undefined) updateData.urgency = data.urgency;
        if (data.del_date !== undefined) updateData.del_date = new Date(data.del_date);

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

        return result[0];
    }

    // Update courier status
    async updateStatus(
        id: number,
        statusData: {
            status: number;
            delivery_date?: string;
            within_time?: boolean;
        },
        userId: number
    ) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        const updateData: Record<string, any> = {
            status: statusData.status,
            updated_at: new Date(),
        };

        // If delivered, add delivery info
        if (statusData.status === COURIER_STATUS.DELIVERED) {
            if (statusData.delivery_date) {
                updateData.delivery_date = new Date(statusData.delivery_date);
            }
            if (statusData.within_time !== undefined) {
                updateData.within_time = statusData.within_time;
            }
        }

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

        return result[0];
    }

    /**
     * Dispatch with docket slip file (POST endpoint)
     */
    async createDispatch(id: number, dispatchData: DispatchCourierDto, file: Express.Multer.File | undefined, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        // Validate dispatch data
        this.validateDispatchData(dispatchData);

        // Prepare update data
        const updateData: Record<string, any> = {
            courier_provider: dispatchData.courier_provider.trim(),
            docket_no: dispatchData.docket_no.trim(),
            pickup_date: new Date(dispatchData.pickup_date),
            status: COURIER_STATUS.DISPATCHED,
            updated_at: new Date(),
        };

        console.log("FILE RECEIVED:", file);

        // If file is uploaded, add it to courier_docs
        if (file) {
            console.log("FILE RECEIVED:", file);
            const newDoc: CourierDoc = {
                url: `/uploads/couriers/docket-slips/${file.filename}`,
                name: file.originalname,
                type: file.mimetype.startsWith("image/") ? "image" : "file",
            };

            const existingDocs = (existing.courier_docs as CourierDoc[]) || [];
            updateData.courier_docs = [...existingDocs, newDoc];
        }

        const result = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

        console.log(result);
        return result[0];
    }

    // Update dispatch info
    async updateDispatch(
        id: number,
        dispatchData: {
            courier_provider: string;
            docket_no: string;
            pickup_date: string;
        },
        userId: number
    ) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        const result = await this.db
            .update(couriers)
            .set({
                courier_provider: dispatchData.courier_provider,
                docket_no: dispatchData.docket_no,
                pickup_date: new Date(dispatchData.pickup_date),
                status: COURIER_STATUS.DISPATCHED,
                updated_at: new Date(),
            })
            .where(eq(couriers.id, id))
            .returning();

        return result[0];
    }

    async delete(id: number, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        if (existing.user_id !== userId) {
            throw new ForbiddenException("Not authorized to delete this courier");
        }

        await this.db.delete(couriers).where(eq(couriers.id, id));

        return { success: true };
    }

    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        if (existing.user_id !== userId) {
            throw new ForbiddenException("Not authorized");
        }

        const newDocs = files.map(file => ({
            url: `/uploads/couriers/${file.filename}`,
            name: file.originalname,
            type: file.mimetype.startsWith("image") ? "image" : "file",
        }));

        const existingDocs = (existing.courier_docs as any[]) || [];
        const updatedDocs = [...existingDocs, ...newDocs];

        const result = await this.db
            .update(couriers)
            .set({
                courier_docs: updatedDocs,
                updated_at: new Date(),
            })
            .where(eq(couriers.id, id))
            .returning();

        return result[0];
    }

    // Upload delivery POD
    async uploadDeliveryPod(id: number, file: Express.Multer.File, userId: number) {
        const existing = await this.findOne(id);

        if (!existing) {
            throw new NotFoundException("Courier not found");
        }

        const result = await this.db
            .update(couriers)
            .set({
                delivery_pod: `/uploads/couriers/pod/${file.filename}`,
                updated_at: new Date(),
            })
            .where(eq(couriers.id, id))
            .returning();

        return result[0];
    }
}
