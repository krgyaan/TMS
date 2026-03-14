import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { projects } from "@/db/schemas/operations/projects.schema";

@Injectable()
export class ProjectsMasterService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getAllProjectsMaster() {
        const projectsMaster = await this.db.select().from(projects);
        return projectsMaster;
    }

    async getProjectMasterById(id: number) {
        const project = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
        return project;
    }
}
