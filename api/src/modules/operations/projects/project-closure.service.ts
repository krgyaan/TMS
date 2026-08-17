import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { users } from "@/db/schemas";
import { projectClosureDocuments } from "@/db/schemas/operations/project-closure.schema";
import { FileUploadService } from "@/modules/file-upload/file-upload.service";
import type { AddProjectClosureDocumentDto } from "./dto/project-closure.dto";

export const CLOSURE_DOCUMENT_CATEGORIES: Record<string, string[]> = {
    Photos: ["Site Photos"],
    WorkOrders: ["Work Order", "SAP Work Order"],
    Billing_Docs: ["Purchase Invoices", "Sale Invoices", "Delivery Challans", "E-Way Bills"],
    Certificates: ["Completion Certificates", "Performance Certificates"],
    Compliance: ["GST Returns", "CRAC (GEM)"],
};

const CLOSURE_DOCUMENT_TO_CATEGORY = new Map<string, string>();
for (const [category, documents] of Object.entries(CLOSURE_DOCUMENT_CATEGORIES)) {
    for (const document of documents) {
        CLOSURE_DOCUMENT_TO_CATEGORY.set(document, category);
    }
}

@Injectable()
export class ProjectClosureService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly fileUploadService: FileUploadService
    ) {}

    async getDocuments(projectId: number) {
        return this.db
            .select({
                id: projectClosureDocuments.id,
                projectId: projectClosureDocuments.projectId,
                category: projectClosureDocuments.category,
                documentName: projectClosureDocuments.documentName,
                files: projectClosureDocuments.files,
                uploadedBy: projectClosureDocuments.uploadedBy,
                uploadedByName: users.name,
                createdAt: projectClosureDocuments.createdAt,
                updatedAt: projectClosureDocuments.updatedAt,
            })
            .from(projectClosureDocuments)
            .leftJoin(users, eq(users.id, projectClosureDocuments.uploadedBy))
            .where(eq(projectClosureDocuments.projectId, projectId))
            .orderBy(asc(projectClosureDocuments.category), asc(projectClosureDocuments.documentName));
    }

    async addDocument(projectId: number, dto: AddProjectClosureDocumentDto, userId: number) {
        const category = CLOSURE_DOCUMENT_TO_CATEGORY.get(dto.documentName);
        if (!category) {
            throw new BadRequestException(`Unknown closure document: ${dto.documentName}`);
        }

        const [existing] = await this.db
            .select()
            .from(projectClosureDocuments)
            .where(and(eq(projectClosureDocuments.projectId, projectId), eq(projectClosureDocuments.documentName, dto.documentName)))
            .limit(1);

        if (existing) {
            const mergedFiles = [...new Set([...existing.files, ...dto.files])];
            const [updated] = await this.db
                .update(projectClosureDocuments)
                .set({ files: mergedFiles, updatedAt: new Date() })
                .where(and(eq(projectClosureDocuments.projectId, projectId), eq(projectClosureDocuments.documentName, dto.documentName)))
                .returning();
            return updated;
        }

        const [created] = await this.db
            .insert(projectClosureDocuments)
            .values({
                projectId,
                category,
                documentName: dto.documentName,
                files: dto.files,
                uploadedBy: userId,
            })
            .returning();
        return created;
    }

    async deleteDocument(projectId: number, documentName: string) {
        const [existing] = await this.db
            .select()
            .from(projectClosureDocuments)
            .where(and(eq(projectClosureDocuments.projectId, projectId), eq(projectClosureDocuments.documentName, documentName)))
            .limit(1);
        if (!existing) {
            throw new NotFoundException("Closure document not found");
        }

        await Promise.all(existing.files.map(file => this.fileUploadService.delete(file)));
        await this.db.delete(projectClosureDocuments).where(and(eq(projectClosureDocuments.projectId, projectId), eq(projectClosureDocuments.documentName, documentName)));

        return { success: true, documentName };
    }
}
