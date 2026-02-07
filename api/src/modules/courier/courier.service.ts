// src/modules/courier/courier.service.ts
import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException, LoggerService } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { couriers } from "@/db/schemas/shared/couriers.schema";
import { users } from "@/db/schemas/auth/users.schema";

import type { CreateCourierDto } from "@/modules/courier/zod/create-courier.schema";
import type { UpdateCourierDto, UpdateCourierInput } from "@/modules/courier/zod/update-courier.schema";
import type { CreateDispatchInput, DispatchCourierDto } from "@/modules/courier/zod/dispatch-courier.schema";

import { CreateCourierSchema } from "@/modules/courier/zod/create-courier.schema";

import { MailerService } from "@/mailer/mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";

import { CourierMailTemplates } from "./courier.mail";
import { fi } from "zod/v4/locales";
import { stat } from "fs";
import { from } from "rxjs";

import { MailAudienceService } from "@/core/mail/mail-audience.service";
import { UpdateCourierStatusInput } from "./zod/update-courier-status.schema";

// Status constants
export const COURIER_STATUS = {
    PENDING: 0,
    IN_TRANSIT: 1,
    DISPATCHED: 2,
    NOT_DELIVERED: 3,
    DELIVERED: 4,
    REJECTED: 5,
} as const;

const COURIER_STATUS_LABELS: string[] = ["Pending", "In Transit", "Dispatched", "Not Delivered", "Delivered", "Rejected"];

interface CourierDoc {
    url: string;
    name: string;
    type: "image" | "file";
}

@Injectable()
export class CourierService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        @Inject(DRIZZLE)
        private readonly db: DbInstance,
        private readonly mailerService: MailerService,
        private readonly googleService: GoogleService,

        private readonly mailAudience: MailAudienceService
    ) {}

    //General db helper functions to carry out simple DB ops
    // Get all couriers (dashboard)
    async findAll() {
        this.logger.info("Fetching all couriers for dashboard");

        try {
            const result = await this.db.query.couriers.findMany({
                orderBy: (courier, { desc }) => desc(courier.createdAt),
                with: { empFromUser: true },
            });

            this.logger.debug("Couriers fetched", { count: result.length });

            return result;
        } catch (error: any) {
            this.logger.error("Failed to fetch all couriers", {
                error: error.message,
            });
            throw error;
        }
    }

    // Get couriers by status
    async findByStatus(status: number) {
        this.logger.debug("Fetching couriers by status", { status });

        try {
            const result = await this.db.select().from(couriers).where(eq(couriers.status, status)).orderBy(desc(couriers.createdAt));

            this.logger.debug("Couriers fetched by status", {
                status,
                count: result.length,
            });

            return result;
        } catch (error: any) {
            this.logger.error("Failed to fetch couriers by status", {
                status,
                error: error.message,
            });
            throw error;
        }
    }

    // Grouped by status
    async findAllGroupedByStatus() {
        this.logger.debug("Grouping couriers by status");

        try {
            const allCouriers = await this.findAll();

            const byStatus = {
                pending: allCouriers.filter(c => c.status === COURIER_STATUS.PENDING),
                dispatched: allCouriers.filter(c => c.status === COURIER_STATUS.DISPATCHED),
                not_delivered: allCouriers.filter(c => c.status === COURIER_STATUS.NOT_DELIVERED),
                delivered: allCouriers.filter(c => c.status === COURIER_STATUS.DELIVERED),
                rejected: allCouriers.filter(c => c.status === COURIER_STATUS.REJECTED),
            };

            const counts = {
                pending: byStatus.pending.length,
                dispatched: byStatus.dispatched.length,
                not_delivered: byStatus.not_delivered.length,
                delivered: byStatus.delivered.length,
                rejected: byStatus.rejected.length,
            };

            this.logger.debug("Courier grouping complete", counts);

            return { ...byStatus, counts };
        } catch (error: any) {
            this.logger.error("Failed to group couriers by status", {
                error: error.message,
            });
            throw error;
        }
    }

    async findAllByUser(userId: number) {
        this.logger.debug("Fetching couriers for user", { userId });

        try {
            const result = await this.db.select().from(couriers).where(eq(couriers.userId, userId)).orderBy(desc(couriers.createdAt));

            this.logger.debug("User couriers fetched", {
                userId,
                count: result.length,
            });

            return result;
        } catch (error: any) {
            this.logger.error("Failed to fetch user couriers", {
                userId,
                error: error.message,
            });
            throw error;
        }
    }

    async findOne(id: number) {
        this.logger.debug("Fetching courier", { courierId: id });

        try {
            const result = await this.db.select().from(couriers).where(eq(couriers.id, id)).limit(1);

            if (!result[0]) {
                this.logger.warn("Courier not found", { courierId: id });
                return null;
            }

            return result[0];
        } catch (error: any) {
            this.logger.error("Failed to fetch courier", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    async findOneWithDetails(id: number) {
        this.logger.info("Fetching courier with details", { courierId: id });

        try {
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
                this.logger.warn("Courier not found for details", {
                    courierId: id,
                });
                throw new NotFoundException("Courier not found");
            }

            const sender = await this.db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                })
                .from(users)
                .where(eq(users.id, result[0].empFrom))
                .limit(1);

            this.logger.debug("Courier details loaded", {
                courierId: id,
            });

            return {
                ...result[0],
                sender: sender[0] ?? null,
            };
        } catch (error: any) {
            this.logger.error("Failed to fetch courier details", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    private validateDispatchData(dispatchData: DispatchCourierDto): void {
        this.logger.debug("Validating dispatch data", {
            courierProvider: dispatchData.courierProvider,
            docketNo: dispatchData.docketNo,
            pickupDate: dispatchData.pickupDate,
        });

        if (!dispatchData.courierProvider?.trim()) {
            this.logger.warn("Dispatch validation failed: courierProvider missing");
            throw new BadRequestException("Courier provider is required");
        }

        if (!dispatchData.docketNo?.trim()) {
            this.logger.warn("Dispatch validation failed: docketNo missing");
            throw new BadRequestException("Docket number is required");
        }

        if (!dispatchData.pickupDate) {
            this.logger.warn("Dispatch validation failed: pickupDate missing");
            throw new BadRequestException("Pickup date is required");
        }

        const pickupDate = new Date(dispatchData.pickupDate);
        if (isNaN(pickupDate.getTime())) {
            this.logger.warn("Dispatch validation failed: invalid pickupDate", {
                pickupDate: dispatchData.pickupDate,
            });
            throw new BadRequestException("Invalid pickup date format");
        }
    }

    //Actual business logic begins from here
    async create(data: CreateCourierDto, files: Express.Multer.File[], userId: number) {
        const dto = CreateCourierSchema.parse(data);
        this.logger.info("Courier DTO", { data: dto });

        try {
            const courierDocs = Array.isArray(files) ? files.map(file => file.filename) : [];

            const values = {
                userId,
                toOrg: dto.toOrg,
                toName: dto.toName,
                toAddr: dto.toAddr,
                toPin: dto.toPin,
                toMobile: dto.toMobile,
                empFrom: dto.empFrom ?? userId,
                delDate: dto.delDate,
                urgency: dto.urgency,
                courierDocs,
                status: COURIER_STATUS.PENDING,
            };

            this.logger.info("Insert values", { values });

            const [courier] = await this.db.insert(couriers).values(values).returning();

            if (!courier) {
                throw new Error("Failed to create courier");
            }

            this.logger.info("Courier created successfully", {
                courierId: courier.id,
            });

            if (!dto.empFrom) {
                this.logger.warn("Emp From not found while sending courier create mail.");
            }

            // ===== MAIL SIDE EFFECT (non-blocking for courier creation) =====
            try {
                const googleConnection = await this.googleService.getSanitizedGoogleConnection(dto.empFrom);

                if (!googleConnection) {
                    this.logger.warn("Google connection missing, mail skipped", {
                        courierId: courier.id,
                    });
                    return courier;
                }

                let toEmailsList = await this.mailAudience.getEmailsByRoleId(4, 8);

                let ccMail = await this.mailAudience.getEmailsByRoleId(2);

                this.logger.info("To Email List", { toEmailsList });
                this.logger.info("CC Email List", { ccMail });

                await this.mailerService.sendMail(
                    CourierMailTemplates.COURIER_REQUEST,
                    {
                        ...courier,
                        dispatch_link: `${process.env.FRONTEND_URL}/courier/${courier.id}/dispatch`,
                    },
                    {
                        to: toEmailsList,
                        cc: ccMail,
                        subject: "Courier Dispatch Request",
                        attachments: courierDocs.length ? { files: courierDocs, baseDir: "courier" } : undefined,
                    },
                    googleConnection
                );
            } catch (mailError: any) {
                this.logger.error("Courier mail failed (non-blocking)", {
                    courierId: courier.id,
                    error: mailError.message,
                });
            }

            return courier;
        } catch (error: any) {
            this.logger.error("Failed to create courier", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async update(id: number, data: UpdateCourierInput, userId: number) {
        this.logger.info("Updating courier", {
            courierId: id,
            userId,
        });

        try {
            const existing = await this.findOne(id);

            if (!existing) {
                this.logger.warn("Courier not found for update", { courierId: id });
                throw new NotFoundException("Courier not found");
            }

            if (existing.userId !== userId) {
                this.logger.warn("Unauthorized courier update attempt", {
                    courierId: id,
                    userId,
                });
                throw new ForbiddenException("Not authorized to update this courier");
            }

            const updateData: Record<string, any> = {
                updatedAt: new Date(),
            };

            if (data.toOrg !== undefined) updateData.toOrg = data.toOrg.trim();
            if (data.toName !== undefined) updateData.toName = data.toName.trim();
            if (data.toAddr !== undefined) updateData.toAddr = data.toAddr.trim();
            if (data.toPin !== undefined) updateData.toPin = data.toPin.trim();
            if (data.toMobile !== undefined) updateData.toMobile = data.toMobile.trim();
            if (data.empFrom !== undefined) updateData.empFrom = data.empFrom;
            if (data.urgency !== undefined) updateData.urgency = data.urgency;
            if (data.delDate !== undefined) updateData.delDate = data.delDate; // ✅ already Date

            const [updated] = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

            this.logger.info("Courier updated successfully", { courierId: id });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update courier", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    // Update status (delivery info)
    async updateStatus(id: number, statusData: UpdateCourierStatusInput, file: Express.Multer.File | undefined) {
        this.logger.info("Updating courier status", {
            courierId: id,
            status: statusData.status,
            hasFile: !!file,
        });

        try {
            const courierCheck = await this.findOne(id);
            if (!courierCheck) {
                this.logger.warn("Courier not found for status update", { courierId: id });
                throw new NotFoundException("Courier not found");
            }

            const [user] = await this.db.select({ name: users.name, email: users.email, userId: users.id }).from(users).where(eq(users.id, courierCheck.empFrom)).limit(1);
            const [coo] = await this.db.select().from(users).where(eq(users.id, courierCheck.empFrom));

            const googleConnection = await this.googleService.getSanitizedGoogleConnection(coo.id);

            const updateData: Record<string, any> = {
                status: statusData.status,
                updatedAt: new Date(),
            };

            if (statusData.status === COURIER_STATUS.DELIVERED) {
                if (file) updateData.deliveryPod = file.filename;

                if (statusData.delivery_date) updateData.deliveryDate = statusData.delivery_date; // ✅ already Date

                if (statusData.within_time !== undefined) updateData.withinTime = statusData.within_time; // ✅ already boolean
            }

            const [updated] = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

            this.logger.info("Courier status updated in DB", { courierId: id });

            let [to] = await this.db.select().from(users).where(eq(users.id, courierCheck.empFrom));
            let toEmailsList = to.email;
            let ccMail = await this.mailAudience.getEmailsByRoleId(2);

            this.logger.info("To Email List", { toEmailsList });
            this.logger.info("CC Email List", { ccMail });

            // ===== Mail side effect (non-blocking) =====
            if (statusData.status === COURIER_STATUS.DELIVERED && googleConnection) {
                try {
                    await this.mailerService.sendMail(
                        CourierMailTemplates.COURIER_STATUS_UPDATE,
                        { ...updated, fromName: user.name },
                        {
                            to: [toEmailsList],
                            cc: ccMail,
                            subject: `Courier sent to ${updated.toOrg}`,
                            attachments: file ? { files: file.filename, baseDir: "courier" } : undefined,
                        },
                        googleConnection
                    );

                    this.logger.info("Courier delivery mail sent", { courierId: id });
                } catch (mailErr: any) {
                    this.logger.error("Delivery mail failed (non-blocking)", {
                        courierId: id,
                        error: mailErr.message,
                    });
                }
            }

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update courier status", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Dispatch with optional docket slip file (POST endpoint)
     */
    async createDispatch(
        id: number,
        dispatchData: CreateDispatchInput, // ← use zod inferred type
        file: Express.Multer.File | undefined,
        userId: number
    ) {
        this.logger.info("Creating courier dispatch", {
            courierId: id,
            userId,
            hasFile: !!file,
        });

        try {
            const courierCheck = await this.findOne(id);
            if (!courierCheck) throw new NotFoundException("Courier not found");

            const updateData: Record<string, any> = {
                courierProvider: dispatchData.courierProvider.trim(),
                docketNo: dispatchData.docketNo.trim(),
                pickupDate: dispatchData.pickupDate, // ✅ already Date
                status: COURIER_STATUS.DISPATCHED,
                updatedAt: new Date(),
            };

            if (file) updateData.docketSlip = file.filename;

            const [courier] = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

            this.logger.info("Courier dispatch saved", { courierId: id });

            //MAILING LIST
            const from = await this.mailAudience.getCoo();

            const googleConnection = await this.googleService.getSanitizedGoogleConnection(from.id);

            let [to] = await this.db.select().from(users).where(eq(users.id, courierCheck.empFrom));
            let toEmailsList = to.email;

            let ccMail = await this.mailAudience.getEmailsByRoleId(2);

            this.logger.info("To Email List", { toEmailsList });
            this.logger.info("CC Email List", { ccMail });

            // ===== Mail side effect (non-blocking) =====
            if (googleConnection) {
                try {
                    await this.mailerService.sendMail(
                        CourierMailTemplates.COURIER_DISPATCH,
                        { ...courier, fromName: from.name },
                        {
                            to: [toEmailsList],
                            cc: ccMail,
                            subject: `Courier sent to ${courier.toOrg}`,
                            attachments: file ? { files: file.filename, baseDir: "courier" } : undefined,
                        },
                        googleConnection
                    );

                    this.logger.info("Courier delivery mail sent", { courierId: id });
                } catch (mailErr: any) {
                    this.logger.error("Delivery mail failed (non-blocking)", {
                        courierId: id,
                        error: mailErr.message,
                    });
                }
            }

            return courier;
        } catch (error: any) {
            this.logger.error("Failed to create dispatch", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    // Update dispatch info without file
    async updateDispatch(
        id: number,
        dispatchData: CreateDispatchInput, // zod inferred type
        userId: number
    ) {
        this.logger.info("Updating dispatch info", { courierId: id, userId });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            const [updated] = await this.db
                .update(couriers)
                .set({
                    courierProvider: dispatchData.courierProvider.trim(),
                    docketNo: dispatchData.docketNo.trim(),
                    pickupDate: dispatchData.pickupDate, // ✅ already Date
                    status: COURIER_STATUS.DISPATCHED,
                    updatedAt: new Date(),
                })
                .where(eq(couriers.id, id))
                .returning();

            this.logger.info("Dispatch info updated", { courierId: id });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update dispatch info", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    async delete(id: number, userId: number) {
        this.logger.warn("Deleting courier", { courierId: id, userId });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            if (existing.userId !== userId) {
                throw new ForbiddenException("Not authorized");
            }

            await this.db.delete(couriers).where(eq(couriers.id, id));

            this.logger.warn("Courier deleted", { courierId: id });

            return { success: true };
        } catch (error: any) {
            this.logger.error("Failed to delete courier", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    async uploadDocs(id: number, files: Express.Multer.File[], userId: number) {
        this.logger.info("Uploading courier docs", {
            courierId: id,
            filesCount: files.length,
        });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            const existingDocs: string[] = Array.isArray(existing.courierDocs) ? (existing.courierDocs as string[]) : [];

            const updatedDocs = [...existingDocs, ...files.map(f => f.filename)];

            const [updated] = await this.db.update(couriers).set({ courierDocs: updatedDocs, updatedAt: new Date() }).where(eq(couriers.id, id)).returning();

            this.logger.info("Courier docs uploaded", { courierId: id });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to upload courier docs", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }

    // Upload delivery POD
    async uploadDeliveryPod(id: number, file: Express.Multer.File, userId: number) {
        this.logger.info("Uploading delivery POD", {
            courierId: id,
            file: file.filename,
        });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            const [updated] = await this.db
                .update(couriers)
                .set({
                    deliveryPod: `pod/${file.filename}`,
                    updatedAt: new Date(),
                })
                .where(eq(couriers.id, id))
                .returning();

            this.logger.info("Delivery POD uploaded", { courierId: id });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to upload delivery POD", {
                courierId: id,
                error: error.message,
            });
            throw error;
        }
    }
}
