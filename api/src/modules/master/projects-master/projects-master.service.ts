import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { projects } from "@/db/schemas/master/projects.schema";
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

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
