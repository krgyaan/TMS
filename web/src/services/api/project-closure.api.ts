import { BaseApiService } from "./base.service";
import type { AddProjectClosureDocumentDto, ProjectClosureDocumentRow } from "@/modules/operations/project-dashboard/helpers/projectClosure.types";

class ProjectClosureApiService extends BaseApiService {
    constructor() {
        super("/projects");
    }

    async getClosureDocuments(projectId: number): Promise<ProjectClosureDocumentRow[]> {
        return this.get<ProjectClosureDocumentRow[]>(`/${projectId}/closure-documents`);
    }

    async addClosureDocument(projectId: number, data: AddProjectClosureDocumentDto): Promise<ProjectClosureDocumentRow> {
        return this.post<ProjectClosureDocumentRow>(`/${projectId}/closure-documents`, data);
    }

    async deleteClosureDocument(projectId: number, documentName: string): Promise<{ success: boolean; documentName: string }> {
        return this.delete<{ success: boolean; documentName: string }>(
            `/${projectId}/closure-documents/${encodeURIComponent(documentName)}`
        );
    }
}

export const projectClosureApi = new ProjectClosureApiService();
