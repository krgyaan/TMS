import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, asc, desc, eq, getTableColumns, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { users } from "@/db/schemas/auth/users.schema";
import { couriers } from "@/db/schemas/shared/couriers.schema";
import type {
    CourierDashboardQuery,
    CreateCourierDto,
    CreateDispatchInput,
    DispatchCourierDto,
    UpdateCourierInput,
    UpdateCourierStatusInput,
} from "@/modules/courier/dto";
import { MailerService } from "@/mailer/mailer.service";
import { GoogleService, type GoogleConnection } from "@/modules/integrations/google/google.service";
import { OAuthTokenService } from "@/modules/integrations/oauth-token.service";
import { format } from "date-fns";
import { CourierMailTemplates } from "./courier.mail";
import { MailAudienceService } from "@/core/mail/mail-audience.service";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";

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

const URGENCY_LABELS: Record<number, string> = {
    1: "Same Day (Urgent)",
    2: "Next Day",
};

@Injectable()
export class CourierService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        @Inject(DRIZZLE)
        private readonly db: DbInstance,
        private readonly mailerService: MailerService,
        private readonly googleService: GoogleService,

        private readonly mailAudience: MailAudienceService,
        private readonly configService: ConfigService,
        private readonly oauthTokenService: OAuthTokenService,
    ) {}

    private getMailboxUserId(): number {
        const parsed = parseInt(process.env.COURIER_MAILBOX_USER_ID ?? "75", 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 75;
    }

    private formatMailDate(date: Date | string | null | undefined): string {
        if (!date) return "N/A";
        return format(new Date(date), "dd MMM yyyy, hh:mm a");
    }

    private formatMailDateOnly(date: Date | string | null | undefined): string {
        if (!date) return "N/A";
        return format(new Date(date), "dd MMM yyyy");
    }

    /**
     * Resolve the requester, the central courier mailbox (user 75 by default),
     * and the team admin/coordinator emails used as CC.
     */
    private async resolveCourierMailContext(empFromId: number, creatorId: number) {
        const mailboxUserId = this.getMailboxUserId();

        const [requester, mailbox] = await Promise.all([
            this.mailAudience.getActiveUserById(empFromId),
            this.mailAudience.getActiveUserById(mailboxUserId),
        ]);

        let teamId = requester?.primaryTeamId ?? requester?.team ?? null;

        if (teamId === null && creatorId) {
            const creator = await this.mailAudience.getActiveUserById(creatorId);
            teamId = creator?.primaryTeamId ?? creator?.team ?? null;
        }

        let ccUsers = teamId !== null
            ? await this.mailAudience.getActiveUsersByRoleNames(["Admin", "Coordinator"], teamId)
            : [];

        if (ccUsers.length === 0) {
            ccUsers = await this.mailAudience.getActiveUsersByRoleNames(["Admin", "Coordinator"]);
        }

        const excludedEmails = new Set<string>();
        if (mailbox?.email) excludedEmails.add(mailbox.email);
        if (requester?.email) excludedEmails.add(requester.email);

        const ccEmails = [...new Set(
            ccUsers
                .map(user => user.email)
                .filter(email => Boolean(email) && !excludedEmails.has(email))
        )];

        if (ccEmails.length === 0) {
            this.logger.warn("No active admin/coordinator CC recipients resolved for courier mail", {
                empFromId,
                creatorId,
                teamId,
            });
        }

        return { requester, mailbox, ccEmails };
    }

    /**
     * Resolve the Google connection for the logical sender. If the stored
     * connection has no refresh token, try to refresh/obtain an access token
     * via OAuthTokenService instead of falling back to another mailbox.
     */
    private async resolveSenderConnection(userId: number): Promise<GoogleConnection | null> {
        const connection = await this.googleService.getSanitizedGoogleConnection(userId);

        if (!connection) {
            this.logger.warn("No Google OAuth connection found for courier mail sender", { userId });
            return null;
        }

        if (!connection.providerEmail) {
            this.logger.warn("Google OAuth connection has no provider email, courier mail skipped", { userId });
            return null;
        }

        if (connection.hasRefreshToken) {
            return connection;
        }

        const token = await this.oauthTokenService.getValidToken(userId, "google");

        if (!token?.accessToken) {
            this.logger.warn("Sender has no refresh token and no valid access token, courier mail skipped", { userId });
            return null;
        }

        return { ...connection, accessToken: token.accessToken };
    }

    private getStatusMailSubject(status: number, toOrg: string): string {
        switch (status) {
            case COURIER_STATUS.DELIVERED:
                return `Courier delivered to ${toOrg}`;
            case COURIER_STATUS.NOT_DELIVERED:
                return `Courier not delivered to ${toOrg}`;
            case COURIER_STATUS.REJECTED:
                return `Courier delivery rejected for ${toOrg}`;
            case COURIER_STATUS.IN_TRANSIT:
                return `Courier in transit to ${toOrg}`;
            case COURIER_STATUS.DISPATCHED:
                return `Courier dispatched to ${toOrg}`;
            default:
                return `Courier status updated for ${toOrg}`;
        }
    }

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

    private getDashboardOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): SQL<unknown> {
        const direction = sortOrder === "asc" ? asc : desc;

        switch (sortBy) {
            case "id":
                return direction(couriers.id);
            case "toOrg":
                return direction(couriers.toOrg);
            case "toName":
                return direction(couriers.toName);
            case "delDate":
                return direction(couriers.delDate);
            case "courierProvider":
                return direction(couriers.courierProvider);
            case "pickupDate":
                return direction(couriers.pickupDate);
            case "docketNo":
                return direction(couriers.docketNo);
            case "deliveryDate":
                return direction(couriers.deliveryDate);
            case "status":
                return direction(couriers.status);
            case "createdAt":
            default:
                return direction(couriers.createdAt);
        }
    }

    // Paginated dashboard rows with search + sort
    async getDashboard(query: CourierDashboardQuery) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;

        const statusByTab: Record<string, number> = {
            pending: COURIER_STATUS.PENDING,
            dispatched: COURIER_STATUS.DISPATCHED,
            not_delivered: COURIER_STATUS.NOT_DELIVERED,
            delivered: COURIER_STATUS.DELIVERED,
            rejected: COURIER_STATUS.REJECTED,
        };

        const conditions: SQL[] = [];

        if (query.tab) {
            conditions.push(eq(couriers.status, statusByTab[query.tab]));
        }

        if (query.search?.trim()) {
            const pattern = `%${query.search.trim()}%`;
            const matchingUserIds = this.db.select({ id: users.id }).from(users).where(ilike(users.name, pattern));

            conditions.push(
                or(
                    ilike(couriers.toOrg, pattern),
                    ilike(couriers.toName, pattern),
                    ilike(couriers.toAddr, pattern),
                    ilike(couriers.toPin, pattern),
                    ilike(couriers.toMobile, pattern),
                    ilike(couriers.courierProvider, pattern),
                    ilike(couriers.docketNo, pattern),
                    ilike(couriers.trackingNumber, pattern),
                    inArray(couriers.empFrom, matchingUserIds)
                )!
            );
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;
        const orderBy = this.getDashboardOrderBy(query.sortBy, query.sortOrder);
        const courierColumns = getTableColumns(couriers);

        const [rows, [{ count }]] = await Promise.all([
            this.db
                .select({
                    ...courierColumns,
                    empFromUserName: users.name,
                    empFromUserEmail: users.email,
                })
                .from(couriers)
                .leftJoin(users, eq(users.id, couriers.empFrom))
                .where(whereClause)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(couriers)
                .where(whereClause),
        ]);

        const data = rows.map(({ empFromUserName, empFromUserEmail, ...row }) => ({
            ...row,
            empFromUser:
                empFromUserName || empFromUserEmail
                    ? { id: row.empFrom, name: empFromUserName ?? "", email: empFromUserEmail ?? "" }
                    : null,
        }));

        return wrapPaginatedResponse(data, Number(count ?? 0), page, limit);
    }

    // Counts per dashboard tab
    async getDashboardCounts() {
        const [counts] = await this.db
            .select({
                pending: sql<number>`count(*) filter (where ${couriers.status} = ${COURIER_STATUS.PENDING})::int`,
                dispatched: sql<number>`count(*) filter (where ${couriers.status} = ${COURIER_STATUS.DISPATCHED})::int`,
                not_delivered: sql<number>`count(*) filter (where ${couriers.status} = ${COURIER_STATUS.NOT_DELIVERED})::int`,
                delivered: sql<number>`count(*) filter (where ${couriers.status} = ${COURIER_STATUS.DELIVERED})::int`,
                rejected: sql<number>`count(*) filter (where ${couriers.status} = ${COURIER_STATUS.REJECTED})::int`,
            })
            .from(couriers);

        const pending = Number(counts?.pending ?? 0);
        const dispatched = Number(counts?.dispatched ?? 0);
        const notDelivered = Number(counts?.not_delivered ?? 0);
        const delivered = Number(counts?.delivered ?? 0);
        const rejected = Number(counts?.rejected ?? 0);

        return {
            pending,
            dispatched,
            not_delivered: notDelivered,
            delivered,
            rejected,
            total: pending + dispatched + notDelivered + delivered + rejected,
        };
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
    async create(data: CreateCourierDto, userId: number) {
        this.logger.info("Courier DTO", { data });

        try {
            const courierDocs = Array.isArray(data.courierDocs) ? data.courierDocs.filter(Boolean) : [];

            if (!data.empFrom) {
                this.logger.warn("empFrom not provided, falling back to userId", { userId });
            }

            const values = {
                userId,
                toOrg: data.toOrg,
                toName: data.toName,
                toAddr: data.toAddr,
                toPin: data.toPin,
                toMobile: data.toMobile,
                empFrom: data.empFrom ?? userId,
                delDate: data.delDate,
                urgency: data.urgency,
                courierDocs,
                status: COURIER_STATUS.PENDING,
            };

            this.logger.info("Insert values", { values });

            const [courier] = await this.db.insert(couriers).values(values).returning();

            if (!courier) {
                throw new Error("Failed to create courier");
            }

            this.logger.info("Courier created successfully", { courierId: courier.id });

            // ===== MAIL SIDE EFFECT (non-blocking) =====
            try {
                const { requester, mailbox, ccEmails } = await this.resolveCourierMailContext(courier.empFrom, userId);
                const senderConnection = await this.resolveSenderConnection(courier.empFrom);

                if (!mailbox?.email) {
                    this.logger.warn("Courier mailbox recipient not found/inactive, request mail skipped", {
                        courierId: courier.id,
                        mailboxUserId: this.getMailboxUserId(),
                    });
                } else if (!senderConnection) {
                    this.logger.warn("Requester has no usable Google OAuth connection, request mail skipped", {
                        courierId: courier.id,
                        empFrom: courier.empFrom,
                    });
                } else {
                    this.logger.info("Courier request mail recipients resolved", {
                        to: mailbox.email,
                        cc: ccEmails,
                    });

                    await this.mailerService.sendMail(
                        CourierMailTemplates.COURIER_REQUEST,
                        {
                            ...courier,
                            fromName: requester?.name ?? "",
                            delDate: this.formatMailDateOnly(courier.delDate),
                            urgency: URGENCY_LABELS[courier.urgency] ?? String(courier.urgency),
                            dispatchLink: `${this.configService.get<string>('app.publicAppUrl')}/shared/couriers/dispatch/${courier.id}`,
                            hasAttachments: courierDocs.length > 0,
                        },
                        {
                            to: [mailbox.email],
                            cc: ccEmails,
                            subject: "Courier Dispatch Request",
                            replyTo: requester?.email ?? undefined,
                            attachments: courierDocs.length ? { files: courierDocs.map(d => d.split("/").pop() ?? d), baseDir: "courier" } : undefined,
                        },
                        senderConnection
                    );

                    this.logger.info("Courier mail sent successfully", { courierId: courier.id });
                }
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
    async updateStatus(id: number, statusData: UpdateCourierStatusInput) {
        this.logger.info("Updating courier status", { courierId: id, status: statusData.status, hasFile: !!statusData.podDoc });

        try {
            const courierCheck = await this.findOne(id);
            if (!courierCheck) throw new NotFoundException("Courier not found");

            const previousStatus = courierCheck.status;
            const statusChanged = previousStatus !== statusData.status;

            const updateData: Record<string, any> = { status: statusData.status, updatedAt: new Date() };

            if (statusData.status === COURIER_STATUS.DELIVERED) {
                if (statusData.podDoc) updateData.deliveryPod = statusData.podDoc;
                if (statusData.deliveryDate) updateData.deliveryDate = statusData.deliveryDate;
                if (statusData.withinTime !== undefined) updateData.withinTime = statusData.withinTime;
            }

            const [updated] = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();
            this.logger.info("Courier status updated in DB", { courierId: id });

            // ===== Mail side effect (non-blocking) =====
            if (statusChanged && statusData.status !== COURIER_STATUS.PENDING) {
                try {
                    const { requester, mailbox, ccEmails } = await this.resolveCourierMailContext(
                        courierCheck.empFrom,
                        courierCheck.userId
                    );
                    const senderConnection = await this.resolveSenderConnection(this.getMailboxUserId());

                    const isDelivered = statusData.status === COURIER_STATUS.DELIVERED;
                    const podDoc = isDelivered ? statusData.podDoc : undefined;

                    if (!requester?.email) {
                        this.logger.warn("Courier requester not found/inactive, status mail skipped", {
                            courierId: id,
                            empFrom: courierCheck.empFrom,
                        });
                    } else if (!mailbox) {
                        this.logger.warn("Courier mailbox sender not found/inactive, status mail skipped", {
                            courierId: id,
                            mailboxUserId: this.getMailboxUserId(),
                        });
                    } else if (!senderConnection) {
                        this.logger.warn("Courier mailbox has no usable Google OAuth connection, status mail skipped", {
                            courierId: id,
                            mailboxUserId: this.getMailboxUserId(),
                        });
                    } else {
                        this.logger.info("Courier status mail recipients resolved", {
                            to: requester.email,
                            cc: ccEmails,
                            status: statusData.status,
                        });

                        await this.mailerService.sendMail(
                            CourierMailTemplates.COURIER_STATUS_UPDATE,
                            {
                                ...updated,
                                fromName: requester.name,
                                senderName: mailbox.name,
                                statusLabel: COURIER_STATUS_LABELS[statusData.status] ?? "-",
                                pickup: this.formatMailDate(updated.pickupDate),
                                delivery: this.formatMailDate(updated.deliveryDate),
                                withinTimeCheck: updated.withinTime === true ? "Yes" : updated.withinTime === false ? "No" : "N/A",
                                isDelivered,
                                hasPod: Boolean(podDoc),
                            },
                            {
                                to: [requester.email],
                                cc: ccEmails,
                                subject: this.getStatusMailSubject(statusData.status, updated.toOrg),
                                attachments: podDoc ? { files: podDoc.split("/").pop() ?? podDoc, baseDir: "courier" } : undefined,
                            },
                            senderConnection
                        );

                        this.logger.info("Courier status mail sent", { courierId: id, status: statusData.status });
                    }
                } catch (mailErr: any) {
                    this.logger.error("Courier status mail failed (non-blocking)", { courierId: id, error: mailErr.message });
                }
            }

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update courier status", { courierId: id, error: error.message });
            throw error;
        }
    }

    /**
     * Dispatch with optional docket slip file (POST endpoint)
     */
    async createDispatch(id: number, dispatchData: CreateDispatchInput, userId: number) {
        this.logger.info("Creating courier dispatch", {
            courierId: id,
            userId,
            hasFile: !!dispatchData.docketSlip,
        });

        try {
            const courierCheck = await this.findOne(id);
            if (!courierCheck) throw new NotFoundException("Courier not found");

            const updateData: Record<string, any> = {
                courierProvider: dispatchData.courierProvider.trim(),
                docketNo: dispatchData.docketNo.trim(),
                pickupDate: dispatchData.pickupDate,
                status: COURIER_STATUS.DISPATCHED,
                updatedAt: new Date(),
            };

            if (dispatchData.docketSlip) updateData.docketSlip = dispatchData.docketSlip;

            const [courier] = await this.db.update(couriers).set(updateData).where(eq(couriers.id, id)).returning();

            this.logger.info("Courier dispatch saved", { courierId: id });

            // ===== Mail side effect (non-blocking) =====
            try {
                const { requester, mailbox, ccEmails } = await this.resolveCourierMailContext(
                    courierCheck.empFrom,
                    courierCheck.userId
                );
                const senderConnection = await this.resolveSenderConnection(this.getMailboxUserId());

                if (!requester?.email) {
                    this.logger.warn("Courier requester not found/inactive, dispatch mail skipped", {
                        courierId: id,
                        empFrom: courierCheck.empFrom,
                    });
                } else if (!mailbox) {
                    this.logger.warn("Courier mailbox sender not found/inactive, dispatch mail skipped", {
                        courierId: id,
                        mailboxUserId: this.getMailboxUserId(),
                    });
                } else if (!senderConnection) {
                    this.logger.warn("Courier mailbox has no usable Google OAuth connection, dispatch mail skipped", {
                        courierId: id,
                        mailboxUserId: this.getMailboxUserId(),
                    });
                } else {
                    this.logger.info("Courier dispatch mail recipients resolved", {
                        to: requester.email,
                        cc: ccEmails,
                    });

                    await this.mailerService.sendMail(
                        CourierMailTemplates.COURIER_DISPATCH,
                        {
                            ...courier,
                            fromName: requester.name,
                            senderName: mailbox.name,
                            pickupDateTime: this.formatMailDate(courier.pickupDate),
                            hasDocketSlip: Boolean(dispatchData.docketSlip),
                        },
                        {
                            to: [requester.email],
                            cc: ccEmails,
                            subject: `Courier sent to ${courier.toOrg}`,
                            replyTo: requester.email,
                            attachments: dispatchData.docketSlip ? { files: dispatchData.docketSlip.split('/').pop() ?? dispatchData.docketSlip, baseDir: "courier" } : undefined,
                        },
                        senderConnection
                    );

                    this.logger.info("Courier dispatch mail sent", { courierId: id });
                }
            } catch (mailErr: any) {
                this.logger.error("Dispatch mail failed (non-blocking)", {
                    courierId: id,
                    error: mailErr.message,
                });
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

            this.logger.debug("Courier found for deletion", { courierId: id, currentUser: userId });

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

    async uploadDocs(id: number, filenames: string[], userId: number) {
        this.logger.info("Uploading courier docs", {
            courierId: id,
            filesCount: filenames.length,
        });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            const existingDocs: string[] = Array.isArray(existing.courierDocs) ? (existing.courierDocs as string[]) : [];

            const updatedDocs = [...existingDocs, ...filenames];

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
    async uploadDeliveryPod(id: number, filename: string, userId: number) {
        this.logger.info("Uploading delivery POD", {
            courierId: id,
            file: filename,
        });

        try {
            const existing = await this.findOne(id);
            if (!existing) throw new NotFoundException("Courier not found");

            const [updated] = await this.db
                .update(couriers)
                .set({
                    deliveryPod: `pod/${filename}`,
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
