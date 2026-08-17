import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { ProjectClosureService } from "./project-closure.service";
import { AddProjectClosureDocumentSchema } from "./dto/project-closure.dto";

@Controller("projects")
export class ProjectClosureController {
    constructor(private readonly service: ProjectClosureService) {}

    @Get(":id/closure-documents")
    getDocuments(@Param("id", ParseIntPipe) id: number) {
        return this.service.getDocuments(id);
    }

    @Post(":id/closure-documents")
    @HttpCode(HttpStatus.CREATED)
    addDocument(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser() user: ValidatedUser) {
        const dto = AddProjectClosureDocumentSchema.parse(body);
        return this.service.addDocument(id, dto, user.id);
    }

    @Delete(":id/closure-documents/:documentName")
    @HttpCode(HttpStatus.OK)
    deleteDocument(@Param("id", ParseIntPipe) id: number, @Param("documentName") documentName: string) {
        return this.service.deleteDocument(id, documentName);
    }
}
