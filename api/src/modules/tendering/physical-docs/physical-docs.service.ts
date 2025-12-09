import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import {
    physicalDocs,
    physicalDocsPersons,
    type NewPhysicalDocs,
} from '@db/schemas/tendering/physical-docs.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import type {
    CreatePhysicalDocDto,
    UpdatePhysicalDocDto,
} from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

// ============================================================================
// Types
// ============================================================================

type PhysicalDocDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string;
    physicalDocsRequired: string;
    physicalDocsDeadline: Date;
    teamMemberName: string;
    statusName: string;
    physicalDocs: number | null;
    courierNo: number | null;
};

type PhysicalDocPerson = {
    id: number;
    name: string;
    email: string;
    phone: string;
};

type PhysicalDocWithPersons = {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: PhysicalDocPerson[];
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PhysicalDocsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService, // Injected
    ) { }

    async findAll(): Promise<PhysicalDocDashboardRow[]> {
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                physicalDocsRequired: tenderInformation.physicalDocsRequired,
                physicalDocsDeadline: tenderInformation.physicalDocsDeadline,
                teamMember: tenderInfos.teamMember,
                status: tenderInfos.status,
                teamMemberName: users.name,
                statusName: statuses.name,
                physicalDocs: physicalDocs.id,
                courierNo: physicalDocs.courierNo,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    eq(tenderInformation.physicalDocsRequired, 'Yes'),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
                )
            );

        // Sort: pending first, then sent
        const pendingRows = rows.filter((row) => row.physicalDocs === null);
        const sentRows = rows.filter((row) => row.physicalDocs !== null);

        return [...pendingRows, ...sentRows] as unknown as PhysicalDocDashboardRow[];
    }

    async findById(id: number): Promise<PhysicalDocWithPersons | null> {
        const [physicalDoc] = await this.db
            .select()
            .from(physicalDocs)
            .where(eq(physicalDocs.id, id))
            .limit(1);

        if (!physicalDoc) {
            return null;
        }

        // Fetch persons for this physical doc
        const persons = await this.db
            .select()
            .from(physicalDocsPersons)
            .where(eq(physicalDocsPersons.physicalDocId, id));

        return {
            id: physicalDoc.id,
            tenderId: physicalDoc.tenderId,
            courierNo: physicalDoc.courierNo,
            submittedDocs: physicalDoc.submittedDocs,
            persons: persons.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
            })),
        };
    }

    async findByTenderId(tenderId: number): Promise<PhysicalDocDashboardRow | null> {
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                physicalDocsRequired: tenderInformation.physicalDocsRequired,
                physicalDocsDeadline: tenderInformation.physicalDocsDeadline,
                teamMemberName: users.name,
                statusName: statuses.name,
                physicalDocs: physicalDocs.id,
                courierNo: physicalDocs.courierNo,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        return rows[0] as unknown as PhysicalDocDashboardRow;
    }

    async findByTenderIdWithPersons(
        tenderId: number
    ): Promise<PhysicalDocWithPersons | null> {
        const [physicalDoc] = await this.db
            .select()
            .from(physicalDocs)
            .where(eq(physicalDocs.tenderId, tenderId))
            .limit(1);

        if (!physicalDoc) {
            return null;
        }

        // Fetch persons for this physical doc
        const persons = await this.db
            .select()
            .from(physicalDocsPersons)
            .where(eq(physicalDocsPersons.physicalDocId, physicalDoc.id));

        return {
            id: physicalDoc.id,
            tenderId: physicalDoc.tenderId,
            courierNo: physicalDoc.courierNo,
            submittedDocs: physicalDoc.submittedDocs,
            persons: persons.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
            })),
        };
    }

    /**
     * Get physical doc with tender details
     * Uses shared tender service method
     */
    async findByIdWithTender(id: number) {
        const physicalDoc = await this.findById(id);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }

        const tender = await this.tenderInfosService.getTenderForPhysicalDocs(
            physicalDoc.tenderId
        );

        return {
            ...physicalDoc,
            tender,
        };
    }

    async create(data: CreatePhysicalDocDto): Promise<PhysicalDocWithPersons> {
        // Validate tender exists and is approved
        await this.tenderInfosService.validateApproved(data.tenderId);

        return await this.db.transaction(async (tx) => {
            // Insert physical doc
            const [physicalDoc] = await tx
                .insert(physicalDocs)
                .values({
                    tenderId: data.tenderId,
                    courierNo: data.courierNo,
                    submittedDocs: data.submittedDocs || null,
                })
                .returning();

            // Insert persons if provided
            let persons: PhysicalDocPerson[] = [];
            if (data.physicalDocsPersons && data.physicalDocsPersons.length > 0) {
                const personsToInsert = data.physicalDocsPersons.map((person) => ({
                    physicalDocId: physicalDoc.id,
                    name: person.name,
                    email: person.email,
                    phone: person.phone,
                }));

                const insertedPersons = await tx
                    .insert(physicalDocsPersons)
                    .values(personsToInsert)
                    .returning();

                persons = insertedPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            }

            return {
                id: physicalDoc.id,
                tenderId: physicalDoc.tenderId,
                courierNo: physicalDoc.courierNo,
                submittedDocs: physicalDoc.submittedDocs,
                persons,
            };
        });
    }

    async update(
        id: number,
        data: UpdatePhysicalDocDto
    ): Promise<PhysicalDocWithPersons> {
        return await this.db.transaction(async (tx) => {
            // Update physical doc
            const updateData: Partial<NewPhysicalDocs> = {};
            if (data.courierNo !== undefined) updateData.courierNo = data.courierNo;
            if (data.submittedDocs !== undefined)
                updateData.submittedDocs = data.submittedDocs;
            updateData.updatedAt = new Date();

            const [physicalDoc] = await tx
                .update(physicalDocs)
                .set(updateData)
                .where(eq(physicalDocs.id, id))
                .returning();

            if (!physicalDoc) {
                throw new NotFoundException(`Physical doc with ID ${id} not found`);
            }

            // Handle persons if provided
            let persons: PhysicalDocPerson[] = [];
            if (data.physicalDocsPersons !== undefined) {
                // Fetch existing persons
                const existingPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                const newPersons = data.physicalDocsPersons || [];

                // Delete persons that are not in the new list
                const newEmails = new Set(newPersons.map((p) => p.email));
                const personsToDelete = existingPersons.filter(
                    (p) => !newEmails.has(p.email)
                );

                for (const person of personsToDelete) {
                    await tx
                        .delete(physicalDocsPersons)
                        .where(eq(physicalDocsPersons.id, person.id));
                }

                // Update or insert persons
                for (const newPerson of newPersons) {
                    const existingPerson = existingPersons.find(
                        (p) => p.email === newPerson.email
                    );

                    if (existingPerson) {
                        // Update existing person
                        await tx
                            .update(physicalDocsPersons)
                            .set({
                                name: newPerson.name,
                                phone: newPerson.phone,
                                updatedAt: new Date(),
                            })
                            .where(eq(physicalDocsPersons.id, existingPerson.id));
                    } else {
                        // Insert new person
                        await tx.insert(physicalDocsPersons).values({
                            physicalDocId: id,
                            name: newPerson.name,
                            email: newPerson.email,
                            phone: newPerson.phone,
                        });
                    }
                }

                // Fetch updated persons list
                const updatedPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                persons = updatedPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            } else {
                // If persons not provided, fetch existing ones
                const existingPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                persons = existingPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            }

            return {
                id: physicalDoc.id,
                tenderId: physicalDoc.tenderId,
                courierNo: physicalDoc.courierNo,
                submittedDocs: physicalDoc.submittedDocs,
                persons,
            };
        });
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(physicalDocs)
            .where(eq(physicalDocs.id, id))
            .returning();
        if (!result[0]) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
    }
}
