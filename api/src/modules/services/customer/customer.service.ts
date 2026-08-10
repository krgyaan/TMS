import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc, ilike, like, or } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { customerComplaints, serviceEngineers } from "@/db/schemas";
import type {
    AllotEngineerDto,
    CreateCustomerComplaintDto,
    UpdateCustomerComplaintDto,
} from "./dto/customer.dto";

type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

type Executor = Tx | DbInstance;

@Injectable()
export class CustomerService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    private async generateTicketNo(tx: Tx): Promise<string> {
        const now = new Date();
        const mmyy = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;
        const prefix = `CC/${mmyy}/`;

        const [last] = await tx
            .select({ ticketNo: customerComplaints.ticketNo })
            .from(customerComplaints)
            .where(like(customerComplaints.ticketNo, `${prefix}%`))
            .orderBy(desc(customerComplaints.ticketNo))
            .limit(1);

        const seq = last?.ticketNo
            ? (Number(last.ticketNo.split("/").pop()) || 0) + 1
            : 1;

        return `${prefix}${String(seq).padStart(3, "0")}`;
    }

    async list(search?: string) {
        const where = search
            ? or(
                  ilike(customerComplaints.name, `%${search}%`),
                  ilike(customerComplaints.phone, `%${search}%`),
                  ilike(customerComplaints.ticketNo, `%${search}%`),
              )
            : undefined;

        return this.db
            .select()
            .from(customerComplaints)
            .where(where)
            .orderBy(desc(customerComplaints.createdAt));
    }

    private async getByIdTx(tx: Executor, id: number) {
        const [complaint] = await tx
            .select()
            .from(customerComplaints)
            .where(eq(customerComplaints.id, id))
            .limit(1);

        if (!complaint) {
            throw new NotFoundException("Customer complaint not found");
        }

        const engineers = await tx
            .select()
            .from(serviceEngineers)
            .where(eq(serviceEngineers.complaintId, id))
            .orderBy(serviceEngineers.id);

        return { ...complaint, engineers };
    }

    async getById(id: number) {
        return this.getByIdTx(this.db, id);
    }

    async create(body: CreateCustomerComplaintDto, userId?: number) {
        return this.db.transaction(async tx => {
            const ticketNo = await this.generateTicketNo(tx);

            const [complaint] = await tx
                .insert(customerComplaints)
                .values({
                    name: body.name,
                    organization: body.organization ?? null,
                    designation: body.designation ?? null,
                    phone: body.phone,
                    email: body.email,
                    siteProjectName: body.siteProjectName,
                    poNo: body.poNo ?? null,
                    siteLocation: body.siteLocation,
                    attachment: body.attachment ?? null,
                    issueFaced: body.issueFaced ?? null,
                    status: body.status,
                    ticketNo,
                    createdBy: userId,
                })
                .returning();

            const engineers = body.engineers.map(engineer => ({
                complaintId: complaint.id,
                name: engineer.name,
                phone: engineer.phone,
                email: engineer.email,
                allotedBy: engineer.allotedBy ?? userId,
            }));

            if (engineers.length > 0) {
                await tx.insert(serviceEngineers).values(engineers);
            }

            return this.getByIdTx(tx, complaint.id);
        });
    }

    async update(id: number, body: UpdateCustomerComplaintDto) {
        return this.db.transaction(async tx => {
            const [existing] = await tx
                .select({ id: customerComplaints.id })
                .from(customerComplaints)
                .where(eq(customerComplaints.id, id))
                .limit(1);

            if (!existing) {
                throw new NotFoundException("Customer complaint not found");
            }

            const updateData: Record<string, unknown> = {};
            if (body.name !== undefined) updateData.name = body.name;
            if (body.organization !== undefined) updateData.organization = body.organization ?? null;
            if (body.designation !== undefined) updateData.designation = body.designation ?? null;
            if (body.phone !== undefined) updateData.phone = body.phone;
            if (body.email !== undefined) updateData.email = body.email;
            if (body.siteProjectName !== undefined) updateData.siteProjectName = body.siteProjectName;
            if (body.poNo !== undefined) updateData.poNo = body.poNo ?? null;
            if (body.siteLocation !== undefined) updateData.siteLocation = body.siteLocation;
            if (body.attachment !== undefined) updateData.attachment = body.attachment ?? null;
            if (body.issueFaced !== undefined) updateData.issueFaced = body.issueFaced ?? null;
            if (body.status !== undefined) updateData.status = body.status;

            if (Object.keys(updateData).length > 0) {
                await tx.update(customerComplaints).set(updateData).where(eq(customerComplaints.id, id));
            }

            if (body.engineers !== undefined) {
                await tx.delete(serviceEngineers).where(eq(serviceEngineers.complaintId, id));

                const engineers = body.engineers.map(engineer => ({
                    complaintId: id,
                    name: engineer.name,
                    phone: engineer.phone,
                    email: engineer.email,
                    allotedBy: engineer.allotedBy ?? null,
                }));

                if (engineers.length > 0) {
                    await tx.insert(serviceEngineers).values(engineers);
                }
            }

            return this.getByIdTx(tx, id);
        });
    }

    async allotEngineer(id: number, body: AllotEngineerDto, userId?: number) {
        return this.db.transaction(async tx => {
            const [existing] = await tx
                .select({ id: customerComplaints.id })
                .from(customerComplaints)
                .where(eq(customerComplaints.id, id))
                .limit(1);

            if (!existing) {
                throw new NotFoundException("Customer complaint not found");
            }

            const [engineer] = await tx
                .insert(serviceEngineers)
                .values({
                    complaintId: id,
                    name: body.name,
                    phone: body.phone,
                    email: body.email,
                    allotedBy: userId,
                })
                .returning();

            return engineer;
        });
    }

    async updateEngineer(complaintId: number, engineerId: number, body: AllotEngineerDto) {
        return this.db.transaction(async tx => {
            const [existing] = await tx
                .select({ id: serviceEngineers.id })
                .from(serviceEngineers)
                .where(eq(serviceEngineers.id, engineerId))
                .limit(1);

            if (!existing) {
                throw new NotFoundException("Service engineer not found");
            }

            const [engineer] = await tx
                .update(serviceEngineers)
                .set({
                    name: body.name,
                    phone: body.phone,
                    email: body.email,
                })
                .where(eq(serviceEngineers.id, engineerId))
                .returning();

            return engineer;
        });
    }

    async remove(id: number) {
        await this.db.transaction(async tx => {
            const [existing] = await tx
                .select({ id: customerComplaints.id })
                .from(customerComplaints)
                .where(eq(customerComplaints.id, id))
                .limit(1);

            if (!existing) {
                throw new NotFoundException("Customer complaint not found");
            }

            await tx.delete(serviceEngineers).where(eq(serviceEngineers.complaintId, id));
            await tx.delete(customerComplaints).where(eq(customerComplaints.id, id));
        });

        return { success: true };
    }
}
